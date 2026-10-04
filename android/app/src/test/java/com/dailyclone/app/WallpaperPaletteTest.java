package com.dailyclone.app;

import org.junit.Test;
import static org.junit.Assert.*;

public class WallpaperPaletteTest {
    @Test public void pinkKeepsItsRgbAtEveryIntensity() {
        assertArrayEquals(new int[]{0x26b61db1, 0x66b61db1, 0xccb61db1, 0xffb61db1}, WallpaperPalette.customLevels("#b61db1"));
    }
    @Test public void acceptsUppercaseAndBlack() {
        assertEquals(0xffec4899, WallpaperPalette.customLevels("#EC4899")[3]);
        assertEquals(0xff000000, WallpaperPalette.customLevels("#000000")[3]);
    }
    @Test public void presetsAndMalformedHexAreNotParsedAsCustomColors() {
        assertNull(WallpaperPalette.customLevels("emerald"));
        assertNull(WallpaperPalette.customLevels("#pink"));
        assertNull(WallpaperPalette.customLevels(null));
    }
}
