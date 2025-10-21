import { useNavigation, useRoute } from '@react-navigation/native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Entypo from 'react-native-vector-icons/Entypo';

export default function CategoryScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const params: any = (route.params as any) || {};
  const category = typeof params.category === 'string' ? params.category : 'Category';

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Entypo name="chevron-thin-left" size={20} color="white" />
      </TouchableOpacity>
      
      <Text style={styles.title}>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
      <Text style={styles.subtitle}>This is a placeholder page for the selected category.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b12',
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 16,
    marginTop: 30,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(125, 100, 202, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(125, 100, 202, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7d64ca',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
});
