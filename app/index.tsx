import { Header } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Bell } from 'lucide-react-native';

export default function HomeScreen() {
  const navigation = useNavigation();
  return (
    <View style={styles.container}>
      {/* Decorative background elements */}
      <View style={styles.bgBlobOne} />
      <View style={styles.bgBlobTwo} />
      <View style={styles.bgBlobThree} />

      <View style={styles.header}>
        <Header
          title="360Files Share"
          headerStyle={{ backgroundColor: 'transparent', borderBottomWidth: 0 }}
          headerTitleStyle={{ fontSize: 22, fontWeight: 'bold', color: 'white', letterSpacing: 0.3 }}
          headerRight={() => (
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={22} color="white" />
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Share at lightning speed</Text>
        <Text style={styles.heroSubtitle}>
          Send and receive files instantly, securely, and wirelessly.
        </Text>
      </View>

      <View style={styles.buttonsContainer}>
          <TouchableOpacity
          style={[styles.button, styles.buttonPrimary]}
          onPress={() => navigation.navigate('Categories' as never)}
        >
          <FontAwesome name="send-o" size={40} color="white" />
          <Text style={styles.buttonText}>Send</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.buttonSecondary]}>
          <Feather name="download" size={40} color="white" />
          <Text style={styles.buttonText}>Receive</Text>
        </TouchableOpacity>
      </View>
        <Text style={styles.helperText}>Both devices must be on the same network</Text>

        {/* Copyright and image moved to bottom */}
        <View style={styles.bottomCopyrightContainer}>
          {/* <Image
            source={require('../assets/images/image__3 monochrome')}
            style={{ width: 40, height: 40, marginBottom: 10, resizeMode: 'contain', opacity: 0.7 }}
          /> */}
          <Text style={styles.copyRightText}>© 2025 360Files Share. All rights reserved.</Text>
        </View>

    </View>
  );
}

const styles = StyleSheet.create({
  bottomCopyrightContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 120,
    alignItems: 'center',
    zIndex: 10,
  },
  container: {
    flex: 1,
    backgroundColor: '#0b0b12',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    marginTop: 25,
    zIndex: 2,
  },
  notificationButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(125, 100, 202, 0.15)',
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(125, 100, 202, 0.2)'
  },
  hero: {
    marginTop: 36,
    paddingHorizontal: 6,
    zIndex: 2,
  },
  heroTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginTop: 40,
    width: '100%',
    zIndex: 2,
  },
  button: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    width: 120,
    borderRadius: 60,
    shadowColor: '#7d64ca',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  buttonPrimary: {
    backgroundColor: 'rgba(125, 100, 202, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  buttonSecondary: {
    backgroundColor: 'rgba(80, 160, 255, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  buttonText: {
    color: 'white',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  helperText: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 28,
    fontSize: 12,
  },
  bgBlobOne: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 200,
    backgroundColor: 'rgba(125, 100, 202, 0.25)',
  },
  bgBlobTwo: {
    position: 'absolute',
    bottom: -70,
    left: -30,
    width: 260,
    height: 260,
    borderRadius: 220,
    backgroundColor: 'rgba(80, 160, 255, 0.18)',
  },
  bgBlobThree: {
    position: 'absolute',
    bottom: 270,
    right: -130,
    width: 290,
    height: 290,
    borderRadius: 220,
    backgroundColor: 'rgba(197, 80, 255, 0.18)',
  },
  copyRightText:{
    color: 'rgba(211, 207, 222, 0.15)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: -200,
    fontWeight: '700',
    letterSpacing: 0.3,
  }
});
