package com.dailyclone.app;

/** CSS hex colors use RGB followed by alpha; Android's integer colors use ARGB. */
final class WallpaperPalette {
    static int[] customLevels(String hex) {
        if (hex == null || !hex.matches("#[0-9a-fA-F]{6}")) return null;
        int rgb = Integer.parseInt(hex.substring(1), 16);
        return new int[]{(38 << 24) | rgb, (102 << 24) | rgb, (204 << 24) | rgb, 0xff000000 | rgb};
    }
}
