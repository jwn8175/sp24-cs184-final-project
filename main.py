import moderngl_window as mglw

class App(mglw.WindowConfig):
    gl_version = (3, 3)
    window_size = (900, 900)
    aspect_ratio = window_size[0] / window_size[1]
    resource_dir = "./"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.quad = mglw.geometry.quad_fs()
        self.prog = self.load_program(
            vertex_shader="./shaders/default.vert",
            fragment_shader="./shaders/default.frag",
        )
        self.texture = self.load_texture_2d("./textures/bird.png")

    def set_uniform(self, u_name: str, u_value):
        try:
            self.prog[u_name] = u_value
        except KeyError:
            print(f"Uniform: {u_name} is not defined in the shader program. ")

    def render(self, time, frame_time):
        self.ctx.clear()
        self.texture.use()
        self.quad.render(self.prog)


if __name__ == "__main__":
    mglw.run_window_config(App)
