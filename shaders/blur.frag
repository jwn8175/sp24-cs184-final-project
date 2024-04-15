#version 330

uniform sampler2D tex;
uniform float inv_tex_width;
uniform float inv_tex_height;
uniform int screen_width;
uniform int screen_height;

in vec2 uv;

out vec4 out_color;

const int ksize = 4;
const int ksize2 = (ksize * 2 + 1) * (ksize * 2 + 1);

void main() {
    out_color = vec4(0.0);    
    for (int i = -ksize; i <= ksize; ++i) {
        for (int j = -ksize; j <= ksize; ++j) {
            vec2 kernel_uv = uv + vec2(float(i) * inv_tex_width, float(j) * inv_tex_height);
            vec4 col = texture(tex, kernel_uv);
            out_color += col;
        }
    }
    out_color = out_color * 1.0 / ksize2;   
}
