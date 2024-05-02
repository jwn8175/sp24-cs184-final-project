#version 330

uniform sampler2D tex;
// uniform vec2 seeds[1000];

in vec2 uv;

out vec4 out_color;

layout(std140) uniform seed_buffer
{
    vec2 seeds[4000];
};

float manhattan_dist(vec2 a, vec2 b) {
    return abs(a.x - b.x) + abs(a.y-b.y);
}

void main() {
    float dist = manhattan_dist(seeds[0], uv);
    vec2 chosen_uv = seeds[0];

    for (int i = 1; i < 4000; ++i) {
        float current = manhattan_dist(seeds[i], uv);
        if (current < dist) {
            chosen_uv = seeds[i];
            dist = current;
        }
    }
    out_color = texture(tex, chosen_uv);
}
