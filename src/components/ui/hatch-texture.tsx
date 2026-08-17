import { StyleSheet, View, ImageBackground } from 'react-native';

/**
 * Diagonal hatch texture overlay — matches the slash-texture SVG
 * from the .info folder. White diagonal lines on transparent
 * background, tiled across the card surface for depth.
 *
 * Uses a real PNG tile (not an SVG data URI) because React Native's
 * native Image cannot decode SVG. The PNG is a 64x64 tile with
 * 3px white diagonal lines at 16px spacing, tiled with resizeMode:
 * 'repeat' so it covers any card size seamlessly.
 */

const HATCH_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAA0ElEQVR42u3YMQ7CMBAEQM7///NRUQRMIEpl76RK41i7sqzcVHd3VdXj4tPd/Xpfef14/9jVzVdfP642ONts5fV1p/kdyhvJ4auqRnL4v07AzuF/FrB7+NMCEsJ/LSAl/LSApPAfBaSFPxSQGP50Fkj5PR7J4aeXYNpgNJLDH05A6kjMA3gAD+ABPIAH8AAewAN4AA/gATyAB/AAHsADeAAP4AE8gAfwAB7AA3gAD+ABPIAH8AAewAN4AA/gATyAB/AAHsADeAAP4AE8YMcL8wneZBSEcZJPsQAAAABJRU5ErkJggg==';

const HATCH_DATA_URI = `data:image/png;base64,${HATCH_PNG_BASE64}`;

export function HatchTexture({ opacity = 0.12 }: { opacity?: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ImageBackground
        source={{ uri: HATCH_DATA_URI }}
        style={StyleSheet.absoluteFill}
        imageStyle={{ resizeMode: 'repeat', opacity }}
      />
    </View>
  );
}
