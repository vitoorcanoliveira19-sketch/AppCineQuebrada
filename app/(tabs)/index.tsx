import { useRouter } from 'expo-router'; // 👈 Importação corrigida para Expo Router
import React from 'react';
import { Dimensions, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

// Definição dos nomes das rotas para referência. 
// No Expo Router, eles se referem aos nomes dos arquivos/pastas.
type ActivityRoutes = 
    | 'capoeira' 
    | 'ballet' 
    | 'fitdance' 
    | 'cinequebrada' 
    | 'hortaorganica';

// 1. Componente de Ícone de Projeto
interface ProjectIconProps {
    label: string;
    iconSource: any; 
    onPress: () => void; // Ação de clique
}

const ProjectIcon: React.FC<ProjectIconProps> = ({ label, iconSource, onPress }) => (
    <TouchableOpacity style={styles.iconWrapper} onPress={onPress}>
        <Image 
          source={iconSource} 
          style={styles.projectIcon} 
          resizeMode="contain"
        /> 
        <Text style={styles.iconLabel}>{label}</Text>
    </TouchableOpacity>
);

// 2. Componente Principal da Tela Home
// Não recebe mais a prop 'navigation'
export default function HomeScreen() { 
    
    // 💥 CORREÇÃO: Usando o hook useRouter() para acessar a navegação
    const router = useRouter(); 

    // Função de navegação que usa 'router.push()' com o caminho do arquivo/rota
    const navigateToActivity = (path: ActivityRoutes) => {
        // Supondo que suas telas de atividade estão dentro de uma pasta 'activities' 
        // e os arquivos são nomeados como, por exemplo, 'activities/capoeira.tsx'.
        // Se a rota for root (ex: app/capoeira.tsx), use `router.push(path)`.
        router.push(`/activities/${path}`);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {/* WARN: Recomenda-se usar View e Padding com 'react-native-safe-area-context' 
               em vez de SafeAreaView para consistência. */}
            <ScrollView style={styles.container}>
            
            {/* --- Header/Navegação --- */}
            <View style={styles.headerContainer}>
                <View style={styles.logoTop}>
                    <Image 
                    source={require('../../assets/images/logoapp.png')} 
                    style={styles.mainLogo}
                    resizeMode="contain"
                    />
                </View>
                
                <View style={styles.navContainer}>
                    {['QUEM SOMOS', 'PROJETOS', 'CONTATO', 'NOTÍCIAS'].map((item) => (
                    <TouchableOpacity key={item} style={styles.navItem}>
                        <Text style={styles.navText}>{item}</Text>
                    </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* --- Área Central Estática (Imagem de Fundo) --- */}
            <View style={styles.staticArea}> 
                <Image 
                source={require('../../assets/images/ImagemCentro.png')} 
                style={styles.staticBackgroundIcon}
                resizeMode="cover" 
                />
                <Text style={styles.highlightText}>#CINEQUEBRADA</Text>
            </View>

            {/* --- Seção de Ícones de Projetos (onPress corrigido) --- */}
            <View style={styles.iconSectionContainer}>
                <ProjectIcon 
                    label="Capoeira" 
                    iconSource={require('../../assets/images/LogoCapoeira.png')}
                    onPress={() => navigateToActivity('capoeira')} // 👈 Chamada corrigida
                />
                
                <ProjectIcon 
                    label="Ballet" 
                    iconSource={require('../../assets/images/LogoBallet.png')} 
                    onPress={() => navigateToActivity('ballet')} // 👈 Chamada corrigida
                />
                
                <ProjectIcon 
                    label="FitDance" 
                    iconSource={require('../../assets/images/LogoFitdance.png')} 
                    onPress={() => navigateToActivity('fitdance')} // 👈 Chamada corrigida
                />
                
                <ProjectIcon 
                    label="CineQuebra..." 
                    iconSource={require('../../assets/images/LogoCineQuebra.png')} 
                    onPress={() => navigateToActivity('cinequebrada')} // 👈 Chamada corrigida
                />
                
                <ProjectIcon 
                    label="Horta Orgân..." 
                    iconSource={require('../../assets/images/LogoHorta.png')} 
                    onPress={() => navigateToActivity('hortaorganica')} // 👈 Chamada corrigida
                />
            </View>
            
            {/* --- Rodapé Social --- */}
            <View style={styles.footerContainer}>
                    <View style={styles.instagramIconFrame}>
                        <Text style={styles.instagramIconText}>O</Text>
                    </View>
                    <Text style={styles.instagramText}>@CINEQUEBRADA_</Text>
            </View>

            </ScrollView>
        </SafeAreaView>
    );
}

// 3. Estilos
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#000' },
    container: { flex: 1, backgroundColor: '#000000' },
    headerContainer: { paddingHorizontal: 15, paddingTop: 10, },
    logoTop: { alignItems: 'center', marginBottom: 5, paddingVertical: 10, },
    mainLogo: { width: 150, height: 30, marginBottom: 5, },
    logoText: { color: '#FFD700', fontSize: 10, fontWeight: 'bold' },
    navContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#333333', },
    navItem: { paddingHorizontal: 5, },
    navText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14, },
    staticArea: { width: '100%', height: 300, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)', },
    staticBackgroundIcon: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%', opacity: 0.7, },
    highlightText: { color: '#FFFFFF', fontSize: 40, fontWeight: '900', zIndex: 10, },
    iconSectionContainer: { flexDirection: 'row', justifyContent: 'space-around', flexWrap: 'wrap', paddingVertical: 20, borderTopWidth: 1, borderTopColor: '#333333', },
    iconWrapper: { alignItems: 'center', width: width / 5, paddingHorizontal: 5 },
    projectIcon: { width: 45, height: 45, marginBottom: 5 },
    iconLabel: { color: '#FFFFFF', fontSize: 10, textAlign: 'center' },
    footerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15, borderTopWidth: 1, borderTopColor: '#333333', backgroundColor: '#000000', },
    instagramIconFrame: { marginRight: 8, borderWidth: 1, borderColor: 'white', borderRadius: 5, paddingHorizontal: 5, },
    instagramIconText: { color: 'white', fontWeight: 'bold', fontSize: 14, },
    instagramText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', },
});