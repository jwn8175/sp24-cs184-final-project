#version 330

uniform sampler2D tex;
uniform float inv_tex_width;
uniform float inv_tex_height;

in vec2 uv;

out vec4 out_color;

const int kernel_size = 3;
const int kernel_size_squared = kernel_size * kernel_size;
const int square_size = kernel_size * 2 - 1;

float illum(vec4 col) {
    return 0.2126 * col[0] + 0.7152 * col[1] + 0.0722 * col[2];
}

float variance(float s_1, float s_2) {
    float num_1 = 1.0 / (kernel_size_squared - 1);
    float num_2 = s_2 - (s_1 * s_1) / kernel_size_squared;
    return num_1 * num_2;
}

void main() {
    /* Square implementation of the Kuwahara filter here. */
    mat4 average_color;

    vec4 s_1;
    vec4 s_2;
    vec4 color_variances;

    for(int x = 1 - kernel_size; x <= 0; x++) {
        for(int y = 1 - kernel_size; y <= 0; y++) {
            vec2 kernel_uv = vec2(uv.x + float(x) * inv_tex_width, uv.y + float(y) * inv_tex_height);
            vec4 col = texture(tex, kernel_uv);
            average_color[0] += col;
            s_1[0] += illum(col);
            s_2[0] += illum(col * col);
        }
    }
    average_color[0] = average_color[0] * 1.0 / kernel_size_squared;
    color_variances[0] = variance(s_1[0], s_2[0]);

    for(int x = 0; x <= kernel_size - 1; x++) {
        for(int y = 1 - kernel_size; y <= 0; y++) {
            vec2 kernel_uv = vec2(uv.x + float(x) * inv_tex_width, uv.y + float(y) * inv_tex_height);
            vec4 col = texture(tex, kernel_uv);
            average_color[1] += col;
            s_1[1] += illum(col);
            s_2[1] += illum(col * col);
        }
    }
    average_color[1] = average_color[1] * 1.0 / kernel_size_squared;
    color_variances[1] = variance(s_1[1], s_2[1]);

    for(int x = 1 - kernel_size; x <= 0; x++) {
        for(int y = 0; y <= kernel_size - 1; y++) {
            vec2 kernel_uv = vec2(uv.x + float(x) * inv_tex_width, uv.y + float(y) * inv_tex_height);
            vec4 col = texture(tex, kernel_uv);
            average_color[2] += col;
            s_1[2] += illum(col);
            s_2[2] += illum(col * col);
        }
    }
    average_color[2] = average_color[2] * 1.0 / kernel_size_squared;
    color_variances[2] = variance(s_1[2], s_2[2]);

    for(int x = 0; x <= kernel_size - 1; x++) {
        for(int y = 0; y <= kernel_size - 1; y++) {
            vec2 kernel_uv = vec2(uv.x + float(x) * inv_tex_width, uv.y + float(y) * inv_tex_height);
            vec4 col = texture(tex, kernel_uv);
            average_color[3] += col;
            s_1[3] += illum(col);
            s_2[3] += illum(col * col);
        }
    }
    average_color[3] = average_color[3] * 1.0 / kernel_size_squared;
    color_variances[3] = variance(s_1[3], s_2[3]);

    if(color_variances[0] <= color_variances[1] && color_variances[0] <= color_variances[2] && color_variances[0] <= color_variances[3]) {
        out_color = average_color[0];
    } else if(color_variances[1] <= color_variances[0] && color_variances[1] <= color_variances[2] && color_variances[1] <= color_variances[3]) {
        out_color = average_color[1];
    } else if(color_variances[2] <= color_variances[0] && color_variances[2] <= color_variances[1] && color_variances[2] <= color_variances[3]) {
        out_color = average_color[2];
    } else if(color_variances[3] <= color_variances[0] && color_variances[3] <= color_variances[1] && color_variances[3] <= color_variances[2]) {
        out_color = average_color[3];
    } else {
        out_color = vec4(0.0);
    }
}