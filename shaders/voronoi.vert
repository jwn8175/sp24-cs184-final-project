#version 330

in vec2 in_position;
in vec2 in_texcoord_0;
in vec2 in_vertex_seed;

out vec2 uv;
out vec2 vertex_seed;

void main() {
    uv = in_texcoord_0;
    vertex_seed = in_vertex_seed;
    gl_Position = vec4(in_position, 0.0, 1.0);
}
