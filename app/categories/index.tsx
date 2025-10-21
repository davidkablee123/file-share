import { useNavigation } from '@react-navigation/native';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Entypo from 'react-native-vector-icons/Entypo';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const CATEGORIES = [
  { key: 'photos', label: 'Photos', icon: <Ionicons name="images-outline" size={28} color="white" />, color: 'rgba(255, 182, 72, 0.9)' },
  { key: 'videos', label: 'Videos', icon: <Ionicons name="videocam-outline" size={28} color="white" />, color: 'rgba(255, 99, 132, 0.9)' },
  { key: 'audios', label: 'Audios', icon: <Ionicons name="musical-notes-outline" size={28} color="white" />, color: 'rgba(120, 200, 255, 0.9)' },
  { key: 'documents', label: 'Documents', icon: <Feather name="file-text" size={26} color="white" />, color: 'rgba(125, 100, 202, 0.95)' },
  { key: 'others', label: 'Files', icon: <MaterialCommunityIcons name="folder-outline" size={28} color="white" />, color: 'rgba(100, 220, 180, 0.9)' },
];

export default function CategoriesScreen() {
  const navigation = useNavigation();
  
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Entypo name="chevron-thin-left" size={20} color="white" />
      </TouchableOpacity>
      <Text style={styles.title}>Choose a category</Text>
      <Text style={styles.subtitle}>Browse your files by type</Text>

      <FlatList
        data={CATEGORIES}
        numColumns={2}
        keyExtractor={(item) => item.key}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: item.color }]}
            onPress={() => {
              switch (item.key) {
                case 'photos':
                  navigation.navigate('ImageGallery' as never);
                  break;
                case 'videos':
                  navigation.navigate('VideoGallery' as never);
                  break;
                case 'audios':
                  navigation.navigate('AudioGallery' as never);
                  break;
                case 'documents':
                  navigation.navigate('DocumentsGallery' as never);
                  break;
                case 'others':
                  navigation.navigate('OtherFiles' as never);
                  break;
                default:
                  navigation.navigate('CategoryDetail' as never);
              }
            }}
            activeOpacity={0.85}
          >
            <View style={styles.iconWrap}>{item.icon}</View>
            <Text style={styles.cardLabel}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b12',
    paddingHorizontal: 16,
    paddingTop: 20,
    marginTop: 30,
  },
  backButton: {
    position: 'absolute',
    marginTop: 30,
    top: 20, left: 16, zIndex: 10, width: 40, height: 40,
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
    marginTop: 60,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  listContent: {
    paddingVertical: 12,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    flex: 1,
    marginHorizontal: 6,
    height: 120,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  iconWrap: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  cardLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
