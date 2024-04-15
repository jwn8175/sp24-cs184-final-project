#version 330

uniform sampler2D tex;
uniform float inv_tex_width;
uniform float inv_tex_height;

in vec2 uv;

out vec4 out_color;

const int ksize = 9;
const int ksize2 = ksize * ksize;

void main() {
    out_color = vec4(0.0);
    for (int i = -ksize / 2; i <= ksize / 2; ++i) {
        for (int j = -ksize / 2; j <= ksize / 2; ++j) {
            vec2 kernel_uv = vec2(uv.x + float(i) * inv_tex_width, uv.y + float(j) * inv_tex_height);
            vec4 col = texture(tex, kernel_uv);
            out_color += col;
        }
    }
    out_color = out_color * 1.0 / ksize2;
}
