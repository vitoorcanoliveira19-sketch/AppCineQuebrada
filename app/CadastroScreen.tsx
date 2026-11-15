import { Picker } from "@react-native-picker/picker";
import CheckBox from "expo-checkbox";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { enviarInscricao } from "./services/api";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// Removendo a importação de Ionicons para evitar dependências extras, 
// voltando ao texto '<' para garantir a funcionalidade imediata.

export default function CadastroScreen() {
  const router = useRouter(); 
  const { atividade } = useLocalSearchParams<{ atividade?: string }>();
  const [enviando, setEnviando] = useState(false);
  const [resultadoEnvio, setResultadoEnvio] = useState<{ tipo: 'sucesso' | 'erro'; mensagem: string } | null>(null);

  // OTIMIZAÇÃO: Agrupando estados de dados pessoais e endereço
  const [dadosPessoais, setDadosPessoais] = useState({
      nome: "",
      dataNascimento: "",
      rg: "",
      celular: "",
      telefone: "",
      email: "",
  });
  const [endereco, setEndereco] = useState({
      cep: "",
      bairro: "",
      logradouro: "",
      numero: "",
  });

  const [genero, setGenero] = useState("");
  const [responsavelNome, setResponsavelNome] = useState("");
  const [responsavelTelefone, setResponsavelTelefone] = useState("");
  const [aceito, setAceito] = useState(false);

  // Função de Voltar
  const handleGoBack = () => {
    router.back();
  };

  // Função de Submissão com Validação Básica
  const handleSubmit = async () => {
    const nascimento = dadosPessoais.dataNascimento.trim();
    const dataISO = /^\d{2}\/\d{2}\/\d{4}$/.test(nascimento)
      ? `${nascimento.slice(6)}-${nascimento.slice(3, 5)}-${nascimento.slice(0, 2)}`
      : nascimento;
    if (!dadosPessoais.nome.trim() || !dataISO || !dadosPessoais.celular.trim() || !dadosPessoais.email.trim() ||
      !endereco.cep.trim() || !endereco.bairro.trim() || !endereco.logradouro.trim() || !endereco.numero.trim() ||
      !atividade || !aceito) {
        setResultadoEnvio({ tipo: 'erro', mensagem: 'Preencha os dados pessoais, endereço e atividade, e aceite as políticas de privacidade.' });
        return;
    }
    setResultadoEnvio(null);
    setEnviando(true);
    try {
      const resultado = await enviarInscricao({
        ...dadosPessoais,
        dataNascimento: dataISO,
        ...endereco,
        genero,
        responsavelNome,
        responsavelTelefone,
        atividadeInteresse: typeof atividade === 'string' ? atividade : '',
      });
      setResultadoEnvio({ tipo: 'sucesso', mensagem: resultado.mensagem });
      Alert.alert("Inscrição enviada", resultado.mensagem, [{ text: 'OK', onPress: () => router.replace('/') }]);
    } catch (error) {
      setResultadoEnvio({ tipo: 'erro', mensagem: error instanceof Error ? error.message : "Confira sua conexão e tente novamente." });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      
      {/* NAVBAR MODIFICADA */}
      <View style={styles.navbar}>
        
        {/* BOTÃO VOLTAR */}
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </TouchableOpacity>
        
        {/* LOGO E TÍTULO CENTRAL */}
        <View style={styles.navCenter}>
          <Image
            // Certifique-se de que o caminho '.../assets/images/logoapp.png' está correto
            source={require("../assets/images/logoapp.png")} 
            style={styles.logo}
          />
          <Text style={styles.navTitle}>Cinequebrada</Text>
        </View>
        
        {/* Espaço em branco para alinhar o título centralmente */}
        <View style={styles.backButton} /> 
      </View>

      {/* TÍTULO */}
      <Text style={styles.title}>FAÇA SEU CADASTRO!</Text>

      {/* FORMULÁRIO */}
      <View style={styles.form}>
        <Text style={styles.label}>NOME:</Text>
        <TextInput
          style={styles.input}
          placeholder="Digite seu nome"
          placeholderTextColor="#888"
          value={dadosPessoais.nome}
          onChangeText={(text) => setDadosPessoais({...dadosPessoais, nome: text})}
          autoCapitalize="words"
        />

        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>DATA DE NASCIMENTO:</Text>
            <TextInput
              style={styles.input}
              placeholder="00/00/0000"
              placeholderTextColor="#888"
              keyboardType="numeric"
              value={dadosPessoais.dataNascimento}
              onChangeText={(text) => setDadosPessoais({...dadosPessoais, dataNascimento: text})}
            />
          </View>

          <View style={styles.column}>
            <Text style={styles.label}>RG:</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite seu RG"
              placeholderTextColor="#888"
              value={dadosPessoais.rg}
              onChangeText={(text) => setDadosPessoais({...dadosPessoais, rg: text})}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>CELULAR:</Text>
            <TextInput
              style={styles.input}
              placeholder="(00) 00000-0000"
              placeholderTextColor="#888"
              keyboardType="phone-pad"
              value={dadosPessoais.celular}
              onChangeText={(text) => setDadosPessoais({...dadosPessoais, celular: text})}
            />
          </View>

          <View style={styles.column}>
            <Text style={styles.label}>TELEFONE:</Text>
            <TextInput
              style={styles.input}
              placeholder="(00) 0000-0000"
              placeholderTextColor="#888"
              keyboardType="phone-pad"
              value={dadosPessoais.telefone}
              onChangeText={(text) => setDadosPessoais({...dadosPessoais, telefone: text})}
            />
          </View>
        </View>

        <Text style={styles.label}>E-MAIL:</Text>
        <TextInput
          style={styles.input}
          placeholder="exemplo@email.com"
          placeholderTextColor="#888"
          keyboardType="email-address"
          value={dadosPessoais.email}
          onChangeText={(text) => setDadosPessoais({...dadosPessoais, email: text})}
        />

        <Text style={styles.label}>RESPONSÁVEL (se menor de idade):</Text>
        <TextInput style={styles.input} placeholder="Nome do responsável" placeholderTextColor="#888" value={responsavelNome} onChangeText={setResponsavelNome} autoCapitalize="words" />
        <Text style={styles.label}>TELEFONE DO RESPONSÁVEL:</Text>
        <TextInput style={styles.input} placeholder="(00) 00000-0000" placeholderTextColor="#888" keyboardType="phone-pad" value={responsavelTelefone} onChangeText={setResponsavelTelefone} />

        <Text style={styles.label}>ATIVIDADE DE INTERESSE:</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={typeof atividade === 'string' ? atividade : ''} onValueChange={(value) => router.setParams({ atividade: value })} style={styles.picker} dropdownIconColor="#FFD700">
            <Picker.Item label="Selecione uma atividade" value="" color="#000" />
            <Picker.Item label="Futebol" value="Futebol" color="#000" />
            <Picker.Item label="Karatê" value="Karatê" color="#000" />
            <Picker.Item label="Capoeira" value="Capoeira" color="#000" />
            <Picker.Item label="Ballet" value="Ballet" color="#000" />
            <Picker.Item label="FitDance" value="FitDance" color="#000" />
            <Picker.Item label="CineQuebrada" value="CineQuebrada" color="#000" />
            <Picker.Item label="Horta Orgânica" value="Horta Orgânica" color="#000" />
            <Picker.Item label="Reforço escolar" value="Reforço escolar" color="#000" />
          </Picker>
        </View>

        <Text style={styles.label}>CEP:</Text>
        <TextInput
          style={styles.input}
          placeholder="00000-000"
          placeholderTextColor="#888"
          keyboardType="numeric"
          value={endereco.cep}
          onChangeText={(text) => setEndereco({...endereco, cep: text})}
        />

        <View style={styles.row}>
          <View style={styles.column}>
            <Text style={styles.label}>BAIRRO:</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite o bairro"
              placeholderTextColor="#888"
              value={endereco.bairro}
              onChangeText={(text) => setEndereco({...endereco, bairro: text})}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.column}>
            <Text style={styles.label}>LOGRADOURO:</Text>
            <TextInput
              style={styles.input}
              placeholder="Rua, avenida..."
              placeholderTextColor="#888"
              value={endereco.logradouro}
              onChangeText={(text) => setEndereco({...endereco, logradouro: text})}
              autoCapitalize="words"
            />
          </View>
        </View>

        <Text style={styles.label}>NÚMERO:</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 123"
          placeholderTextColor="#888"
          keyboardType="numeric"
          value={endereco.numero}
          onChangeText={(text) => setEndereco({...endereco, numero: text})}
        />

        <Text style={styles.label}>GÊNERO:</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={genero}
            onValueChange={(itemValue) => setGenero(itemValue)}
            style={styles.picker}
            dropdownIconColor="#FFD700"
          >
            <Picker.Item label="Selecione o gênero" value="" color="#000" />
            <Picker.Item label="Masculino" value="Masculino" color="#000" />
            <Picker.Item label="Feminino" value="Feminino" color="#000" />
            <Picker.Item label="Outro" value="Outro" color="#000" />
          </Picker>
        </View>

        <View style={styles.checkboxContainer}>
          <CheckBox value={aceito} onValueChange={setAceito} color={aceito ? '#FFD700' : '#FFF'} />
          <Text style={styles.checkboxLabel}>
            LI E CONCORDO COM AS POLÍTICAS DE PRIVACIDADE
          </Text>
        </View>

        {resultadoEnvio && <Text accessibilityRole="alert" style={resultadoEnvio.tipo === 'sucesso' ? styles.successMessage : styles.errorMessage}>{resultadoEnvio.mensagem}</Text>}

        <TouchableOpacity style={[styles.button, enviando && styles.buttonDisabled]} onPress={handleSubmit} disabled={enviando} accessibilityRole="button">
          <Text style={styles.buttonText}>{enviando ? 'ENVIANDO...' : 'ENVIAR INSCRIÇÃO'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomColor: "#FFD700",
    borderBottomWidth: 1,
  },
  navCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 10,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: 'bold',
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: "contain",
    marginRight: 10,
  },
  navTitle: {
    color: "#FFD700",
    fontSize: 20,
    fontWeight: "bold",
  },
  title: {
    color: "#FFD700",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginVertical: 25,
  },
  form: {
    backgroundColor: "#111",
    borderRadius: 10,
    padding: 20,
    marginBottom: 40,
  },
  label: {
    color: "#FFD700",
    fontWeight: "bold",
    marginBottom: 5,
    marginTop: 15,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: "#FFD700",
    paddingVertical: 8,
    color: "#FFF",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  column: {
    flex: 1,
    marginRight: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#FFD700",
    borderRadius: 5,
    backgroundColor: "#FFF",
    overflow: "hidden",
  },
  picker: {
    color: "#000",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  checkboxLabel: {
    color: "#FFF",
    marginLeft: 10,
    flex: 1,
    fontSize: 12,
  },
  button: {
    backgroundColor: "#FFD700",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 25,
  },
  buttonText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorMessage: {
    color: "#FF8A80",
    marginTop: 16,
  },
  successMessage: {
    color: "#A5D6A7",
    marginTop: 16,
  },
});
