#version 330

uniform sampler2D tex;

in vec2 uv;

out vec4 out_color;

// Heavily inspired by the approach outlined in the following text:
// https://www.taylorfrancis.com/chapters/edit/10.1201/b10648-22/anisotropic-kuwahara-filtering-gpu
// This is part of a multi-step process for the anisotropic kuwahara filter.
// This is the third processing step applied.

void main() {
    vec3 samp = texture(tex, uv).xyz;
    float eigenval1 = 0.5 * (samp.y + 
                           samp.x + 
                           sqrt(samp.y * samp.y - 2.0 * samp.x * samp.y +
                           samp.x * samp.x + 
                           4.0 * samp.z * samp.z));
    float eigenval2 = 0.5 * (samp.y + 
                           samp.x - 
                           sqrt(samp.y * samp.y - 2.0 * samp.x * samp.y + 
                           samp.x * samp.x + 
                           4.0 * samp.z * samp.z));

    vec2 eigentex = vec2(eigenval1 - samp.x, -samp.z);
    vec2 adjust_eigentex = vec2(0, 0);

    if (length(eigentex) > 0.0) {
        adjust_eigentex = normalize(eigentex);
    } else {
        adjust_eigentex = vec2(0, 1.0);
    }

    float phi = atan(adjust_eigentex.y, adjust_eigentex.x);

    float A_ellipse_coeff = 0.0;

    if (eigenval1 + eigenval2 > 0.0) {
        A_ellipse_coeff = (eigenval1 - eigenval2) / (eigenval1 + eigenval2);
    }

    out_color = vec4(adjust_eigentex, phi, A_ellipse_coeff);
}