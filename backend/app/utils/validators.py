def validar_cpf(cpf: str) -> bool:
    cpf = "".join(filter(str.isdigit, cpf))
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False
    for i in range(9, 11):
        soma = sum(int(cpf[j]) * ((i + 1) - j) for j in range(i))
        digito = (soma * 10 % 11) % 10
        if int(cpf[i]) != digito:
            return False
    return True


def validar_cnpj(cnpj: str) -> bool:
    cnpj = "".join(filter(str.isdigit, cnpj))
    if len(cnpj) != 14 or cnpj == cnpj[0] * 14:
        return False
    pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    for pesos, pos in [(pesos1, 12), (pesos2, 13)]:
        soma = sum(int(cnpj[i]) * pesos[i] for i in range(len(pesos)))
        digito = 11 - (soma % 11)
        digito = 0 if digito >= 10 else digito
        if int(cnpj[pos]) != digito:
            return False
    return True
