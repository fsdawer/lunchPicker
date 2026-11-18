import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
};

export function FeaturePlaceholder({ icon, title, description }: Props) {
  return (
    <View style={styles.screen}>
      <View style={styles.iconCircle}><Ionicons name={icon} size={32} color="#C2410C" /></View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 90, backgroundColor: '#FFF9F5' },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#FCE7D8', alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 20, color: '#1F2937', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  description: { marginTop: 10, color: '#475569', fontSize: 15, lineHeight: 23, textAlign: 'center' },
});
