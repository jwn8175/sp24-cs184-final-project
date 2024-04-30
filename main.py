import moderngl
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
        self.num_instances = 1
        self.kszie = self.argv.ksize
        self.setup_shaders()
        self.setup_texture()
        print(f"INFO - Rendering window with size {(self.wnd.width, self.wnd.height)}")

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
        inv_tex_width, inv_tex_height = 1.0 / img.size[0], 1.0 / img.size[1]
        tex_width, tex_height, tex_size = img.size[0], img.size[1], img.size[0] * img.size[1]
        img.close()

        # for the Kuwahara shaders
        self.set_uniform("inv_tex_width", 1.0 / inv_tex_width)
        self.set_uniform("inv_tex_height", 1.0 / inv_tex_height)
        self.set_uniform("tex_height", tex_height)
        self.set_uniform("tex_width", tex_width)
        self.set_uniform("tex_size", tex_size)
        
        # for depth shader optimization when instancing
        r_scale = 50
        r = np.linalg.norm([inv_tex_width, inv_tex_height]) * r_scale
        self.set_uniform("r", r)

    def setup_shaders(self):
        vertex_shader_path = Path("./shaders/default.vert").resolve()
        fragment_shader_path = Path(self.argv.fragment).resolve()
        fragment_shader = fragment_shader_path.parts[-1]

        if fragment_shader == "voronoi_instancing.frag":
            vertex_shader_path = Path("./shaders/voronoi.vert").resolve()

        self.prog = self.load_program(
            vertex_shader=vertex_shader_path,
            fragment_shader=fragment_shader_path,
        )

        if fragment_shader in [
            "voronoi_euclidean.frag",
            "voronoi_manhattan.frag",
            "voronoi_chebyshev.frag",
        ]:
            # rng = np.random.default_rng()
            # Max is about 1000
            # n_seeds = 1000

            # Simply passing an uniform array of seeds
            # Old approach, keeping it here for documentation purposes
            # self.voronoi_seeds = rng.random((n_seeds, 2))
            # self.set_uniform("seeds", self.voronoi_seeds)

            rng = np.random.default_rng()
            # Max is about 4000
            n_seeds = 4000
            print(f"INFO - Applying Voronoi filter with {n_seeds} seed vertices")

            # Using an Uniform Buffer Object to pass seeds
            seed_uniform = self.prog["seed_buffer"]
            self.seed_buffer = self.ctx.buffer(reserve=seed_uniform.size)

            self.prog["seed_buffer"].binding = 0
            self.seed_buffer.bind_to_uniform_block(0)
            self.seed_buffer.write(rng.random((n_seeds, 2), dtype="f4"))

        elif fragment_shader == "voronoi_instancing.frag":
            rng = np.random.default_rng()
            # Max is limited by your GPU capabilities I'm pretty sure
            n_seeds = 10000

            # Using instancing
            self.num_instances = n_seeds
            print(f"INFO - Applying Voronoi filter with {n_seeds} seed vertices")
            print(f"INFO - Instance rendering with {self.num_instances} instances")
            self.instance_data = self.ctx.buffer(rng.random((n_seeds, 2), dtype="f4"))
            self.quad.buffer(self.instance_data, "2f/i", ["in_vertex_seed"])
            self.ctx.enable(moderngl.DEPTH_TEST)

        elif fragment_shader in ["kuwahara_square.frag", "kuwahara_circle.frag", "kuwahara_anisotropic.frag"]:
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
        self.quad.render(program=self.prog, instances=self.num_instances)

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
