#version 330

uniform sampler2D tex;
uniform vec2 seeds[1000];

in vec2 uv;

out vec4 out_color;

float manhattan_dist(vec2 a, vec2 b) {
    return abs(a.x - b.x) + abs(a.y-b.y);
}

float chebyshev_dist(vec2 a, vec2 b) {
    return max(abs(a.x - b.x), abs(a.y-b.y));
}

void main() {
    // float dist = distance(seeds[0], uv);
    // float dist = manhattan_dist(seeds[0], uv);
    float dist = chebyshev_dist(seeds[0], uv);
    vec2 chosen_uv = seeds[0];

    for (int i = 1; i < 1000; ++i) {
        // float current = distance(seeds[i], uv);
        // float current = manhattan_dist(seeds[i], uv);
        float current = chebyshev_dist(seeds[i], uv);
        if (current < dist) {
            chosen_uv = seeds[i];
            dist = current;
        }
    }
    out_color = texture(tex, chosen_uv);
}
