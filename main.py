import moderngl_window as mglw
import numpy as np
from PIL import Image


class App(mglw.WindowConfig):
    # don't change these variable names, they are inherited from the parent class
    gl_version = (3, 3)
    window_size = (600, 800)
    aspect_ratio = window_size[0] / window_size[1]
    resource_dir = "./"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.quad = mglw.geometry.quad_fs()
        self.setup_shaders()
        self.setup_texture()

        # initialize vertices for voronoi
        # should probably edit to under a condition
        # rng seed
        rng = np.random.default_rng(12345)
        n_seeds = 1000
        self.voronoi_seeds = rng.random((n_seeds, 2))
        self.set_uniform("seeds", self.voronoi_seeds)

    def set_uniform(self, u_name: str, u_value):
        try:
            self.prog[u_name] = u_value
        except KeyError:
            print(f"INFO - Uniform: {u_name} is not defined in the shader program. ")

    def setup_texture(self):
        # custom arg parsing is still WIP, if you want to change the 
        # input texture just enter the path here
        tex_path = "./textures/coco.png"
        if self.argv.texture:
            tex_path = self.argv.texture

        self.texture = self.load_texture_2d(tex_path)
        # get texture img metadata to pass as uniforms
        img = Image.open(tex_path).convert("RGB")
        tex_width, tex_height = img.size[0], img.size[1]
        self.set_uniform("inv_tex_width", 1.0 / tex_width)
        self.set_uniform("inv_tex_height", 1.0 / tex_height)
        img.close()

    def setup_shaders(self):
        # custom arg parsing is still WIP, if you want to change the 
        # input shaders just enter the path here
        vertex_shader_path = "./shaders/default.vert"
        fragment_shader_path = "./shaders/default.frag"
        if self.argv.fragment:
            fragment_shader_path = self.argv.fragment

        self.prog = self.load_program(
            vertex_shader=vertex_shader_path,
            fragment_shader=fragment_shader_path,
        )

    @classmethod
    def add_arguments(cls, parser):
        parser.add_argument(
            "--texture",
            help="Path to the texture to use",
        )

        parser.add_argument(
            "--fragment",
            help="Path to the fragment shader to use",
        )

    def render(self, time, frame_time):
        self.ctx.clear()
        self.texture.use()
        self.quad.render(self.prog)


if __name__ == "__main__":
    mglw.run_window_config(App)
