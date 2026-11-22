# Exceção de dependência: Sequelize → uuid

Revisada em 15/11/2026. Responsável: mantenedor do repositório `vitoorcanoliveira19-sketch`. Reavaliar até **15/12/2026** ou imediatamente se o alcance do advisory mudar.

- Advisory: [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq).
- Origem: Sequelize 6.37.8 usa uuid 8.3.2. O npm registra duas entradas moderadas: a dependência e o pacote que a herda.
- Condição afetada: funções UUID v3/v5/v6 com buffer fornecido pelo chamador.
- Avaliação neste projeto: as chamadas inspecionadas de Sequelize usam v1/v4 para identificadores internos. O aplicativo não chama as funções afetadas nem fornece buffers UUID a partir de entradas de usuários.
- Mitigação: manter o alcance atual, testar consultas/transações e monitorar atualização upstream. Não usar um override major de uuid sem validar a compatibilidade CommonJS/API.
- Rejeitado: o downgrade automático sugerido para Sequelize 3.30.0. Introduziria uma versão antiga e uma grande mudança de compatibilidade.
- Encerrar a exceção quando uma versão suportada corrigir a cadeia ou quando uma atualização compatível e testada remover a dependência afetada.

O CI continua bloqueando alertas altos/críticos; esta exceção não desativa o audit e não cobre outras vulnerabilidades.
