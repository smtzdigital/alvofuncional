
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS contract_template text;

UPDATE public.app_settings
SET contract_template = $CT$CONTRATO DE PRESTAÇÃO DE SERVIÇOS E ADESÃO A PLANO DE TREINAMENTO
ALVO FUNCIONAL

1. DAS PARTES
CONTRATADA: ALVO FUNCIONAL CENTRO DE TREINAMENTO LTDA, pessoa jurídica de direito privado, inscrita no CNPJ sob nº 66.868.783/0001-38, com sede em Rua Santo Antônio, nº 56, sala 01, Nova Candelária - RS, telefone/WhatsApp 55 93618-8610, e-mail contato@alvofuncional.com.br, neste ato denominada simplesmente CONTRATADA.

CONTRATANTE/ALUNO(A): Nome completo {{aluno.nome}}, CPF {{aluno.cpf}}, RG {{aluno.rg}}, data de nascimento {{aluno.nascimento}}, telefone/WhatsApp {{aluno.telefone}}, e-mail {{aluno.email}}, endereço {{aluno.endereco}}, neste ato denominado simplesmente CONTRATANTE.
Em caso de aluno menor de idade, este contrato deverá ser assinado pelo responsável legal, que responderá pelo cumprimento das obrigações financeiras, declaração de saúde e autorização de participação do menor.

2. DO OBJETO
O presente contrato tem por objeto a prestação de serviços de condicionamento físico, treinamento funcional, acompanhamento de evolução, avaliação inicial, orientações gerais de treino, acesso às instalações e/ou demais serviços contratados conforme o plano escolhido pelo CONTRATANTE.
Os serviços não substituem acompanhamento médico, nutricional, fisioterapêutico ou psicológico, quando necessário.

PLANO CONTRATADO
Plano: {{plano.nome}}
Descrição: {{plano.descricao}}
Valor: R$ {{plano.valor}}
Vigência: {{plano.duracao_dias}} dias ({{data.inicio}} a {{data.fim}})
Aulas presenciais por semana: {{plano.aulas_semana}}

3. DA ADESÃO, PLANO E VIGÊNCIA
A adesão ao plano ocorre mediante assinatura deste contrato, preenchimento da ficha de cadastro/anamnese, aceite das normas internas e pagamento do valor correspondente. A vigência é a indicada acima; a continuidade depende de renovação expressa ou automática.

4. DOS SERVIÇOS INCLUÍDOS
Conforme o plano contratado, poderão estar incluídos: aulas de treino funcional, avaliação inicial, acompanhamento de evolução, prescrição de treinos, acesso a aplicativo/plataforma, participação em desafios, grupos de comunicação, eventos internos e benefícios promocionais.

5. DAS CONDIÇÕES DE PAGAMENTO
O CONTRATANTE pagará o valor contratado na forma e vencimento escolhidos. O atraso poderá gerar suspensão temporária do acesso até a regularização, sem prejuízo de encargos legais.

6. DO CANCELAMENTO, DESISTÊNCIA E REEMBOLSO
Solicitação por escrito via WhatsApp, e-mail ou canal oficial. Nos planos mensais, o cancelamento produz efeito no ciclo seguinte. Nos planos com prazo determinado e desconto proporcional, o cancelamento antecipado pode implicar recálculo pelo valor mensal cheio e/ou multa de até 20% sobre os meses restantes.

7. DO TRANCAMENTO, PAUSA OU SUSPENSÃO
Depende do tipo de plano. Trancamento por motivo médico exige atestado. A CONTRATADA pode limitar a quantidade de pausas por período contratual.

8. DA AVALIAÇÃO FÍSICA, ANAMNESE E DECLARAÇÃO DE SAÚDE
O CONTRATANTE declara prestar informações verdadeiras sobre sua condição de saúde. A omissão isenta a CONTRATADA por danos decorrentes.

9. DOS RISCOS E RESPONSABILIDADE
A prática envolve riscos inerentes (fadiga, dores, quedas, torções, lesões). A CONTRATADA compromete-se com zelo, orientação profissional e ambiente seguro; o CONTRATANTE compromete-se a respeitar seus limites e comunicar sintomas.

10. OBRIGAÇÕES DO CONTRATANTE
Manter dados atualizados, pagar pontualmente, usar vestuário adequado, respeitar profissionais e alunos, zelar por equipamentos, seguir orientações técnicas e comunicar alterações de saúde.

11. OBRIGAÇÕES DA CONTRATADA
Disponibilizar os serviços conforme o plano, orientar os treinos, manter ambiente adequado, informar alterações de horário, tratar com respeito e observar sigilo dos dados.

12. HORÁRIOS, AGENDAMENTO, FALTAS E REPOSIÇÕES
Horários definidos pela CONTRATADA e alteráveis com aviso prévio. Reposições e limites de vagas conforme regulamento interno.

13. USO DE APLICATIVO, GRUPOS E CANAIS DIGITAIS
Acesso durante a vigência do plano, vedado compartilhamento de login ou redistribuição de conteúdo. Comunicações oficiais podem ocorrer por WhatsApp, e-mail e aplicativo.

14. USO DE IMAGEM
Depende de autorização específica (Anexo III). A não autorização não impede a contratação.

15. PROTEÇÃO DE DADOS PESSOAIS (LGPD)
Dados coletados para cadastro, execução, cobrança, avaliação e cumprimento de obrigações legais. Dados sensíveis (saúde, medidas, fotos) tratados com acesso restrito. Direitos de acesso, correção e eliminação assegurados.

16. BRINDES, PROMOÇÕES E BENEFÍCIOS
Sujeitos a prazos, estoque e permanência mínima; não cumulativos salvo autorização.

17. REGULAMENTO INTERNO
O CONTRATANTE compromete-se a cumprir o regulamento; descumprimento grave pode gerar advertência, suspensão ou rescisão.

18. RESCISÃO PELA CONTRATADA
Possível em inadimplência, conduta agressiva, risco a terceiros, dano ao patrimônio ou informações falsas.

19. DISPOSIÇÕES GERAIS
O contrato pode ser complementado por anexos e regulamento interno. Tolerância a descumprimento não implica renúncia. Nulidade parcial não invalida as demais cláusulas.

20. FORO
Comarca de Três de Maio - RS, ressalvados os direitos do consumidor.

Local e data: Nova Candelária - RS, {{data.hoje}}.


__________________________________________
CONTRATANTE
Nome: {{aluno.nome}}
CPF: {{aluno.cpf}}


__________________________________________
ALVO FUNCIONAL
Representante:$CT$
WHERE contract_template IS NULL;
