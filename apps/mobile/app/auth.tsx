import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/features/auth/AuthContext';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      if (mode === 'login') await signIn(loginId.trim(), password);
      else await signUp(loginId.trim(), password, displayName.trim());
      if (returnTo === '/community/new') router.replace('/community/new' as Href);
      else router.back();
    } catch (cause) { setError(cause instanceof Error ? cause.message : '로그인할 수 없어요.'); }
    finally { setBusy(false); }
  };
  return <SafeAreaView style={styles.screen}><View style={styles.content}>
    <Text style={styles.title}>{mode === 'login' ? '로그인' : '회원가입'}</Text>
    {mode === 'signup' && <TextInput accessibilityLabel="닉네임" placeholder="닉네임" value={displayName} onChangeText={setDisplayName} maxLength={40} style={styles.input} />}
    <TextInput accessibilityLabel="아이디" placeholder="아이디 (영문·숫자·_ 4~30자)" value={loginId} onChangeText={setLoginId} autoCapitalize="none" style={styles.input} />
    <TextInput accessibilityLabel="비밀번호" placeholder="비밀번호 (8자 이상)" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
    {error && <Text style={styles.error}>{error}</Text>}
    <Pressable accessibilityRole="button" disabled={busy} onPress={submit} style={styles.button}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{mode === 'login' ? '로그인' : '가입하기'}</Text>}</Pressable>
    <Pressable accessibilityRole="button" onPress={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }} style={styles.switch}><Text>{mode === 'login' ? '계정 만들기' : '로그인으로 돌아가기'}</Text></Pressable>
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#FFF9F5' }, content: { padding: 24, gap: 14 }, title: { fontSize: 26, fontWeight: '800', color: '#1F2937', marginBottom: 16 }, input: { minHeight: 52, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E7D9CE', borderRadius: 12, paddingHorizontal: 16 }, error: { color: '#B91C1C' }, button: { minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C2410C', borderRadius: 12 }, buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 }, switch: { minHeight: 48, alignItems: 'center', justifyContent: 'center' } });
