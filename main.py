import moderngl_window as mglw
from PIL import Image

class App(mglw.WindowConfig):
    gl_version = (3, 3)
    window_size = (600, 800)
    aspect_ratio = window_size[0] / window_size[1]
    resource_dir = "./"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.quad = mglw.geometry.quad_fs()
        self.prog = self.load_program(
            vertex_shader="./shaders/default.vert",
            fragment_shader="./shaders/kuwahara_circle.frag",
        )
        tex_path = "./textures/coco.png"
        self.texture = self.load_texture_2d(tex_path)

        # get texture img metadata to pass as uniforms
        img = Image.open(tex_path).convert("RGB")
        tex_width, tex_height = img.size[0], img.size[1]
        self.set_uniform("inv_tex_width", 1.0 / tex_width)
        self.set_uniform("inv_tex_height", 1.0 / tex_height)

    def set_uniform(self, u_name: str, u_value):
        try:
            self.prog[u_name] = u_value
        except KeyError:
            print(f"Uniform: {u_name} is not defined in the shader program. ")
    
    @classmethod
    def add_arguments(cls, parser):
        parser.add_argument(
            '--texture_path',
            help="Path to the texture to use",
        )

        parser.add_argument(
            '--fragment_path',
            help="Path to the fragment shader to use",
        )

    def render(self, time, frame_time):
        self.ctx.clear()
        self.texture.use()
        self.quad.render(self.prog)


if __name__ == "__main__":
    mglw.run_window_config(App)
