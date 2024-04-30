#version 330

uniform sampler2D tex;

in vec2 uv;
in vec2 vertex_seed;

uniform float r;

out vec4 out_color;

void main() {
    gl_FragDepth = distance(vertex_seed, uv);
    if (gl_FragDepth > r) {
        discard;
    }
    out_color = texture(tex, vertex_seed);
}
