#version 330

in vec2 in_position;
in vec2 in_texcoord_0;

out vec2 uv;

void main() {
    uv = in_texcoord_0 * vec2(1.0, -1.0);
    gl_Position = vec4(in_position, 0.0, 1.0);
}
