import moderngl_window as mglw
import numpy as np
from PIL import Image
from pathlib import Path
import argparse

MAX_KSIZE = 15
MIN_KSIZE = 2
MAX_WINDOW_SIZE = 800


class App(mglw.WindowConfig):
    # don't change these variable names, they are inherited from the parent class
    gl_version = (3, 3)
    resource_dir = "./"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.quad = mglw.geometry.quad_fs()
        self.kszie = self.argv.ksize
        self.setup_shaders()
        self.setup_texture()
        print(f"INFO - Rending window with size {(self.wnd.width, self.wnd.height)}")

    def set_uniform(self, u_name: str, u_value):
        try:
            self.prog[u_name] = u_value
        except KeyError:
            print(f"INFO - Uniform: {u_name} is not defined in the shader program")

    def setup_texture(self):
        tex_path = Path(self.argv.texture).resolve()
        self.texture = self.load_texture_2d(tex_path)

        # get texture img metadata to pass as uniforms
        img = Image.open(tex_path).convert("RGB")
        tex_width, tex_height = img.size[0], img.size[1]
        self.set_uniform("inv_tex_width", 1.0 / tex_width)
        self.set_uniform("inv_tex_height", 1.0 / tex_height)
        img.close()

    def setup_shaders(self):
        vertex_shader_path = Path("./shaders/default.vert").resolve()
        fragment_shader_path = Path(self.argv.fragment).resolve()
        self.prog = self.load_program(
            vertex_shader=vertex_shader_path,
            fragment_shader=fragment_shader_path,
        )

        fragment_shader = fragment_shader_path.parts[-1]

        if fragment_shader in [
            "voronoi_euclidean.frag",
            "voronoi_manhattan.frag",
            "voronoi.chebyshev.frag",
        ]:
            # initialize vertices for voronoi
            rng = np.random.default_rng()
            n_seeds = 1000
            self.voronoi_seeds = rng.random((n_seeds, 2))
            self.set_uniform("seeds", self.voronoi_seeds)
        elif fragment_shader in ["kuwahara_square.frag", "kuwahara_circle.frag"]:
            # ksize for kuwahara filters
            self.set_uniform("kernel_size", self.kszie)

    @classmethod
    def setup_window(cls, width, height):
        cls.window_size = (width, height)
        cls.aspect_ratio = None

    @classmethod
    def add_arguments(cls, parser):
        parser.add_argument(
            "-t",
            "--texture",
            type=str,
            default="./textures/coco.png",
            help="Path to the texture to use",
        )

        parser.add_argument(
            "-f",
            "--fragment",
            type=str,
            default="./shaders/default.frag",
            help="Path to the fragment shader to use",
        )

        parser.add_argument(
            "-k",
            "--ksize",
            type=int,
            default=5,
            help="Kernel size for the Kuwahara filters",
        )

    def render(self, time, frame_time):
        self.ctx.clear()
        self.texture.use()
        self.quad.render(self.prog)

    def key_event(self, key, action, modifiers):
        if action == self.wnd.keys.ACTION_PRESS:
            if key == self.wnd.keys.EQUAL:
                self.kszie = min(self.kszie + 1, MAX_KSIZE)
                print(f"INFO - Increasing ksize to {self.kszie}")
                self.set_uniform("kernel_size", self.kszie)
            elif key == self.wnd.keys.MINUS:
                self.kszie = max(self.kszie - 1, MIN_KSIZE)
                print(f"INFO - Decreasing ksize to {self.kszie}")
                self.set_uniform("kernel_size", self.kszie)


# We need to set the App class variable window_size
# before calling run_window_config(App), which is why
# this helper function exists.
def setup_app_window():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-t",
        "--texture",
        type=str,
        default="./textures/coco.png",
        help="Path to the texture to use",
    )

    # These are here so the temporary parser does not complain
    # about the other arguments for the App class parser.
    parser.add_argument(
        "-f",
        "--fragment",
    )

    parser.add_argument(
        "-k",
        "--ksize",
    )

    args = parser.parse_args()
    img = Image.open(args.texture).convert("RGB")
    tex_width, tex_height = img.size[0], img.size[1]
    max_dim = max(tex_width, tex_height)
    if max_dim > MAX_WINDOW_SIZE:
        shrink_ratio = MAX_WINDOW_SIZE / max_dim
        tex_width = int(tex_width * shrink_ratio)
        tex_height = int(tex_height * shrink_ratio)
    App.setup_window(tex_width, tex_height)
    img.close()


if __name__ == "__main__":
    setup_app_window()
    mglw.run_window_config(App)
