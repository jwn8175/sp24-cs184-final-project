from typing import Tuple, Union
from pathlib import Path

import moderngl
import moderngl_window
from moderngl_window import geometry
import av


class Decoder:
    def __init__(self, path: Union[str, Path]):
        self.container = av.open(str(path))
        self.video = self.container.streams[0]
        self.video.thread_type = 'AUTO'
        self._last_packet = None
        self._frame_step = float(self.video.time_base)

    @property
    def duration(self) -> float:
        """float: Number of frames in the video"""
        if self.video.duration is None:
            return -1
        return self.video.duration * self.video.time_base

    @property
    def end_time(self):
        return self.video.end_time

    @property
    def average_rate(self) -> float:
        """The average framerate as a float"""
        rate = self.video.average_rate
        return rate.numerator / rate.denominator

    @property
    def frames(self) -> int:
        """int: Number of frames in the video"""
        return self.video.frames

    @property
    def video_size(self) -> Tuple[int, int]:
        """Tuple[int, int]: The width and height of the video in pixels"""
        return self.video.width, self.video.height

    @property
    def current_pos(self):
        """The current position in the stream"""
        if self._last_packet:
            return self._last_packet.pts
        return 0

    @property
    def frame_step(self):
        """Position step for each frame"""
        return self._frame_step

    def time_to_pos(self, time: float) -> int:
        """Converts time to stream position"""
        return time * self.average_rate

    def seek(self, position: int):
        """Seek to a position in the stream"""
        self.container.seek(position, stream=self.video)

    def gen_frames(self):
        for packet in self.container.demux(video=0):
            if packet.pts is not None:
                self._last_packet = packet
            for i, frame in enumerate(packet.decode()):
                yield frame.to_rgb().planes[0]


class Player:
    def __init__(self, ctx: moderngl.Context, path: Union[str, Path]):
        self._ctx = ctx
        self._path = path
        self._decoder = Decoder(self._path)
        self._texture = self._ctx.texture(self._decoder.video_size, 3)
        self._frames = self._decoder.gen_frames()

        self._last_time = 0
        self._fps = self._decoder.average_rate

    @property
    def fps(self) -> float:
        """float: Framerate of the video"""
        return self._fps

    @property
    def duration(self) -> float:
        """float: Length of video in seconds"""
        return self._decoder.duration

    @property
    def frames(self) -> int:
        """int: The number of frames in the video"""
        return self._decoder.frames

    @property
    def video_size(self) -> Tuple[int, int]:
        """Tuple[int, int]: Video size in pixels"""
        return self._decoder.video_size

    @property
    def texture(self) -> moderngl.Texture:
        return self._texture

    def update(self):
        try:
            data = next(self._frames)
        except StopIteration:
            self._decoder = Decoder(self._path)
            self._frames = self._decoder.gen_frames()
            data = next(self._frames)
        self._texture.write(data)

    def next_frame(self) -> av.plane.Plane:
        return next(self._frames)


class VideoApp(moderngl_window.WindowConfig):
    gl_version = (3, 3)
    title = "Video Player"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

        self.player = Player(self.ctx, "videos/huh.mp4")
        print("duration   :", self.player.duration)
        print("fps        :", self.player.fps)
        print("video_size :", self.player.video_size)
        print("frames     :", self.player.frames)
        print("step       :", self.player._decoder.frame_step)

        self.quad = geometry.quad_fs()

        vertex_shader_path = Path(__file__).parent.resolve() / "shaders/default_video.vert"
        fragment_shader_path = Path(__file__).parent.resolve() / "shaders/kuwahara_square.frag"
        
        self.program = self.load_program(
            vertex_shader=vertex_shader_path,
            fragment_shader=fragment_shader_path,
        )
        
        tex_width, tex_height = self.player.video_size[0], self.player.video_size[1]
        self.set_uniform("inv_tex_width", 1.0 / tex_width)
        self.set_uniform("inv_tex_height", 1.0 / tex_height)

    def set_uniform(self, u_name: str, u_value):
        try:
            self.program[u_name] = u_value
        except KeyError:
            print(f"INFO - Uniform: {u_name} is not defined in the shader program. ")

    def render(self, time, frame_time):
        self.player.update()
        self.player.texture.use(0)
        self.quad.render(self.program)


if __name__ == '__main__':
    VideoApp.run()
