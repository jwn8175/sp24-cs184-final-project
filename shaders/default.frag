#version 330

uniform vec2 resolution;
uniform sampler2D texture_1;

out vec4 out_color;

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;
    vec3 col = vec3(0.0);
    out_color = texture(texture_1, uv);
}
