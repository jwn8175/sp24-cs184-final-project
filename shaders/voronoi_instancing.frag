#version 330

uniform sampler2D tex;

in vec2 uv;
in vec2 vertex_seed;

uniform float r;

out vec4 out_color;

void main() {
    float dist = distance(vertex_seed, uv);
    if (dist > r) {
        discard;
    }
    gl_FragDepth = dist;
    out_color = texture(tex, vertex_seed);
}
