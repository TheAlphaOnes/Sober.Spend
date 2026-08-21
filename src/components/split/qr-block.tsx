import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts, FontSizes, Spacing } from '@/constants/theme';

type QR = { modules: { size: number; get: (row: number, col: number) => boolean } };

function buildMatrix(value: string): boolean[][] | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const QRCode = require('qrcode') as { create: (t: string, o?: object) => QR };
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const n = qr.modules.size;
    const grid: boolean[][] = [];
    for (let r = 0; r < n; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < n; c++) row.push(!!qr.modules.get(r, c));
      grid.push(row);
    }
    return grid;
  } catch {
    return null;
  }
}

export function QrBlock({ value }: { value: string }) {
  const grid = useMemo(() => buildMatrix(value), [value]);

  if (!grid) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText} selectable>
          {value}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      {grid.map((row, y) => (
        <View key={y} style={styles.row}>
          {row.map((on, x) => (
            <View key={x} style={[styles.cell, { backgroundColor: on ? Colors.black : Colors.white }]} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: 220,
    height: 220,
    backgroundColor: Colors.white,
    padding: 10,
    alignSelf: 'center',
  },
  row: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1 },
  fallback: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
  },
  fallbackText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.xs,
    color: Colors.black,
  },
});
