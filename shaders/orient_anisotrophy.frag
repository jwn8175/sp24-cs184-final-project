#version 330

uniform sampler2D tex;

in vec2 uv;

out vec4 out_color;

// Heavily inspired by the approach+code outlined in the following text:
// https://www.taylorfrancis.com/chapters/edit/10.1201/b10648-22/anisotropic-kuwahara-filtering-gpu
// This is part of a multi-step process for the anisotropic kuwahara filter.
// This is the third processing step applied.

void main() {
    vec3 samp = texture(tex, uv).xyz;
    float eigenval1 = 0.5 * (samp.y + 
                             samp.x + 
                             sqrt(samp.y * samp.y - 
                             2.0 * samp.x * samp.y +
                             samp.x * samp.x + 
                             4.0 * samp.z * samp.z));
    float eigenval2 = 0.5 * (samp.y + 
                             samp.x - 
                             sqrt(samp.y * samp.y - 
                             2.0 * samp.x * samp.y + 
                             samp.x * samp.x + 
                             4.0 * samp.z * samp.z));

    vec2 eigentex = vec2(eigenval1 - samp.x, -samp.z);
    vec2 adjust_eigentex = vec2(0, 1.0);

    if (length(eigentex) > 0.0) {
        adjust_eigentex = normalize(eigentex);
    }

    float phi = atan(adjust_eigentex.y, adjust_eigentex.x);

    float anisotrophy = 0.0;

    if (eigenval1 + eigenval2 > 0.0) {
        anisotrophy = (eigenval1 - eigenval2) / (eigenval1 + eigenval2);
    }

    out_color = vec4(adjust_eigentex, phi, anisotrophy);
}