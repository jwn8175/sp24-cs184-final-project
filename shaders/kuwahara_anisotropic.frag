#version 330

uniform sampler2D tex;
uniform float inv_tex_width;
uniform float inv_tex_height;

in vec2 uv;

out vec4 out_color;

const float PI = 3.14159265358979323846;
// Kernel size
const int radius = 10;
const int N = 8;


void main() {

    // Note that this code will be VERY VERY similar to Kuwahara Circle (aka generalized Kuwahara),
    // but will require tex sampling and the like...


}