import { useNavigation } from '@react-navigation/native';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Entypo from 'react-native-vector-icons/Entypo';

export default function audioGallery() {
    const navigation = useNavigation();
    return (
        <View>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
            >
                <Entypo name="chevron-thin-left" size={20} color="white" />
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
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
})