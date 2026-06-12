
const swagger = {
    openapi: '3.0.3',
    info: {
        title: 'API - Financeira - FinanceAI',
        description: 'Documentação da API de gerenciamento financeiro - FinanceAI',
        version: '1.0.0'
    },
    servers: [
        // {
        //     url: 'http://localhost:3000',
        //     description: 'Servidor Localhost'
        // },
        {
            url: 'https://api-iota-livid-42.vercel.app/',
            description: 'Servidor de Produção'
        }
    ],
    tags: [
        { name: "Usuários", description: "Operações relacionadas aos usuários" },
        { name: "Login", description: "Operações relacionadas ao login" },
        { name: "Chat", description: "Operações do Chat de IA e histórico" },
        { name: "Transações", description: "Operações de transações financeiras" },
        { name: "Categorias", description: "Operações de categorias" },
        { name: "Subcategorias", description: "Operações de subcategorias" },
        { name: "Open Finance", description: "Operações de integração bancária" },
    ],
    paths: {
        "/usuarios": {
            get: {
                tags: ["Usuários"],
                summary: "Listar Usuários",
                security: [{
                    bearerAuth: []
                }],
                responses: {
                    200: {
                        description: "Dados obtidos com sucesso",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: { $ref: "#/components/schemas/Lista_Usuarios" }
                                }
                            }
                        }
                    }
                }
            },
            post: {
                tags: ["Usuários"],
                summary: "Cadastrar novo usuário ",
                description: "Recebe nome, email, senha, e  para cadastrar novo usuario",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Cadastro_Usuario"
                            }
                        }
                    }
                },
                responses: {
                    201: {
                        description: "Usuario cadastrado com sucesso"
                    },
                    400: {
                        description: "Erro na requisição(preencha todos os campos)"
                    },
                    500: {
                        description: "Erro interno so Servidor"
                    }
                }
            }
        },
        "/usuarios/{id_usuario}": {
            delete: {
                tags: ["Usuários"],
                summary: "Deasativar o usuário",
                description: "Desativa o usuário",
                parameters: [
                    {
                        name: "id_usuario",
                        in: "path",
                        required: true,
                        description: "Id do usuário a ser desativado",
                        schema: { type: 'integer' },
                        example: 1
                    }
                ],
                responses: {
                    200: {
                        description: "Usuário desativado com sucesso",
                        content: { "application/json": { example: "Usuário não encontrado" } }
                    },
                    500: {
                        description: "Erro no Servidor"
                    }
                }
            }
        },
        "/login": {
            post: {
                    tags: ["Login"],
                    summary: "Realizar Login",
                    description: "Recebe email e senha para autenticar o usuário e retornar um token JWT",
                
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Login_Usuario"
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Login realizado com sucesso!",
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/Resposta_Login"
                                }
                            }
                        }
                    },
                    400: { description: "Email e senha são obrigatorios" },
                    401: { description: "Credenciais inválidas" },
                    500: {
                        description: "Erro interno no servidor"
                    }
                }
            }
        },
        "/chat": {
            post: {
                tags: ["Chat"],
                summary: "Enviar mensagem para o chat",
                description: "Envia uma mensagem para o chat e salva no histórico",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Mensagem_Chat"
                            }
                        }
                    }
                },
                responses: {
                    200: {
                        description: "Mensagem enviada com sucesso",
                        content: {
                            "application/json": {
                                schema: { $ref: "#/components/schemas/Resposta_Chat" }
                            }
                        }
                    },
                    500: { description: "Erro interno no servidor" }
                }
            },
            delete: {
                tags: ["Chat"],
                summary: "Limpar histórico do chat",
                description: "Deleta todas as mensagens do histórico do usuário atual",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id_usuario",
                        in: "query",
                        required: true,
                        description: "Id do usuário",
                        schema: { type: 'integer' },
                        example: 1
                    }
                ],
                responses: {
                    200: { description: "Histórico do chat apagado com sucesso" },
                    500: { description: "Erro interno no servidor" }
                }
            }
        },
        "/chat/{id_mensagem}": {
            delete: {
                tags: ["Chat"],
                summary: "Deletar mensagem do chat",
                description: "Deleta uma mensagem específica do histórico",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id_mensagem",
                        in: "path",
                        required: true,
                        description: "Id da mensagem a ser deletada",
                        schema: { type: 'integer' },
                        example: 1
                    }
                ],
                responses: {
                    200: { description: "Mensagem deletada com sucesso" },
                    404: { description: "Mensagem não encontrada" },
                    500: { description: "Erro no Servidor" }
                }
            }
        },
        "/chat/historico": {
            get: {
                tags: ["Chat"],
                summary: "Obter histórico do chat",
                description: "Retorna o histórico de conversas do usuário",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id_usuario",
                        in: "query",
                        required: true,
                        description: "Id do usuário para buscar o histórico",
                        schema: { type: 'integer' },
                        example: 1
                    }
                ],
                responses: {
                    200: {
                        description: "Histórico recuperado com sucesso",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: { $ref: "#/components/schemas/Resposta_Chat" }
                                }
                            }
                        }
                    },
                    500: { description: "Erro interno no servidor" }
                }
            }
        },
        "/categorias": {
            get: {
                tags: ["Categorias"],
                summary: "Listar categorias",
                security: [{ bearerAuth: [] }],
                responses: {
                    200: { description: "Lista de categorias", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Categoria" } } } } }
                }
            },
            post: {
                tags: ["Categorias"],
                summary: "Criar categoria",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/Nova_Categoria" } } }
                },
                responses: {
                    201: { description: "Categoria criada com sucesso" }
                }
            }
        },
        "/categorias/{id_categoria}": {
            put: {
                tags: ["Categorias"],
                summary: "Atualizar categoria",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id_categoria", in: "path", required: true, schema: { type: 'integer' } }],
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/Nova_Categoria" } } }
                },
                responses: {
                    200: { description: "Atualizada com sucesso" }
                }
            },
            delete: {
                tags: ["Categorias"],
                summary: "Excluir categoria",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id_categoria", in: "path", required: true, schema: { type: 'integer' } }],
                responses: {
                    200: { description: "Excluída com sucesso" }
                }
            }
        },
        "/subcategorias": {
            get: {
                tags: ["Subcategorias"],
                summary: "Listar subcategorias",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id_categoria", in: "query", required: false, schema: { type: 'integer' } }],
                responses: {
                    200: { description: "Lista de subcategorias", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Subcategoria" } } } } }
                }
            },
            post: {
                tags: ["Subcategorias"],
                summary: "Criar subcategoria",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/Nova_Subcategoria" } } }
                },
                responses: {
                    201: { description: "Subcategoria criada com sucesso" }
                }
            }
        },
        "/subcategorias/{id_subcategoria}": {
            put: {
                tags: ["Subcategorias"],
                summary: "Atualizar subcategoria",
                description: "Atualiza apenas o nome. IDs não podem ser alterados.",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id_subcategoria", in: "path", required: true, schema: { type: 'integer' } }],
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { $ref: "#/components/schemas/Atualizar_Subcategoria" } } }
                },
                responses: {
                    200: { description: "Atualizada com sucesso" }
                }
            },
            delete: {
                tags: ["Subcategorias"],
                summary: "Excluir subcategoria",
                security: [{ bearerAuth: [] }],
                parameters: [{ name: "id_subcategoria", in: "path", required: true, schema: { type: 'integer' } }],
                responses: {
                    200: { description: "Excluída com sucesso" }
                }
            }
        },
        "/transacoes": {
            get: {
                tags: ["Transações"],
                summary: "Listar transações",
                description: "Retorna a lista de transações financeiras do usuário",
                security: [{ bearerAuth: [] }],
                responses: {
                    200: {
                        description: "Transações listadas com sucesso",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: { $ref: "#/components/schemas/Transacao" }
                                }
                            }
                        }
                    },
                    500: { description: "Erro no Servidor" }
                }
            },
            post: {
                tags: ["Transações"],
                summary: "Registrar transação",
                description: "Cria uma nova transação financeira",
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Nova_Transacao"
                            }
                        }
                    }
                },
                responses: {
                    201: { description: "Transação registrada com sucesso" },
                    400: { description: "Erro de validação dos dados enviados" },
                    500: { description: "Erro interno no servidor" }
                }
            }
        },
        "/transacoes/{id_transacao}": {
            get: {
                tags: ["Transações"],
                summary: "Listar transação pelo ID",
                description: "Retorna uma transação financeira específica",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id_transacao",
                        in: "path",
                        required: true,
                        description: "Id da transação",
                        schema: { type: 'integer' },
                        example: 1
                    }
                ],
                responses: {
                    200: {
                        description: "Transação encontrada",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: { $ref: "#/components/schemas/Transacao" }
                                }
                            }
                        }
                    },
                    404: { description: "Transação não encontrada" },
                    500: { description: "Erro no Servidor" }
                }
            },
            put: {
                tags: ["Transações"],
                summary: "Atualizar transação completamente",
                description: "Atualiza descricao, valor e tipo de uma transação. IDs não podem ser alterados.",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id_transacao",
                        in: "path",
                        required: true,
                        description: "Id da transação",
                        schema: { type: 'integer' },
                        example: 1
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                $ref: "#/components/schemas/Atualizar_Transacao"
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Transação atualizada com sucesso" },
                    404: { description: "Transação não encontrada" },
                    500: { description: "Erro no Servidor" }
                }
            },
            patch: {
                tags: ["Transações"],
                summary: "Atualizar transação parcialmente",
                description: "Atualiza apenas os campos enviados. IDs não podem ser alterados.",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id_transacao",
                        in: "path",
                        required: true,
                        description: "Id da transação",
                        schema: { type: 'integer' },
                        example: 1
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    valor: { type: "number", format: "float", example: 150.50 },
                                    tipo: { type: "string", example: "despesa" },
                                    descricao: { type: "string", example: "Internet" }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: "Transação atualizada parcialmente com sucesso" },
                    404: { description: "Transação não encontrada" },
                    500: { description: "Erro no Servidor" }
                }
            },
            delete: {
                tags: ["Transações"],
                summary: "Deletar transação",
                description: "Deleta uma transação financeira existente pelo ID",
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: "id_transacao",
                        in: "path",
                        required: true,
                        description: "Id da transação a ser deletada",
                        schema: { type: 'integer' },
                        example: 1
                    }
                ],
                responses: {
                    200: { description: "Transação deletada com sucesso" },
                    404: { description: "Transação não encontrada" },
                    500: { description: "Erro no Servidor" }
                }
            }
        },
        "/link-token": {
            post: {
                tags: ["Open Finance"],
                summary: "Gerar token de widget (Polp)",
                description: "Gera um token seguro de autenticação para o frontend abrir o widget do banco.",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { type: "object", properties: { id_usuario: { type: "integer", example: 1 } } } } }
                },
                responses: {
                    200: { description: "Token gerado com sucesso" },
                    400: { description: "Dados obrigatórios faltando" }
                }
            }
        },
        "/conexoes": {
            post: {
                tags: ["Open Finance"],
                summary: "Salvar conexão bancária",
                description: "Grava os dados retornados pelo widget após a autenticação bem-sucedida do usuário no open finance.",
                requestBody: {
                    required: true,
                    content: { "application/json": { schema: { type: "object", properties: { id_usuario: { type: "integer", example: 1 }, public_token: { type: "string" }, instituicao: { type: "string" } } } } }
                },
                responses: {
                    201: { description: "Conexão salva com sucesso" },
                    400: { description: "Dados obrigatórios faltando" }
                }
            }
        },
        "/conexoes/{id_usuario}": {
            get: {
                tags: ["Open Finance"],
                summary: "Sincronizar bancos e cartões",
                description: "Lista as conexões ativas e os cartões vinculados a este usuário.",
                parameters: [
                    { name: "id_usuario", in: "path", required: true, schema: { type: 'integer' } }
                ],
                responses: {
                    200: { description: "Lista de conexões e contas obtida com sucesso" }
                }
            }
        }
    },
        components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: "Insira o token obtido no login"
            }
        },
        schemas: {
            Lista_Usuarios: {
                type: "object",
                properties: {
                    id: { type: "integer", example: 1 },
                    nome: { type: "string", example: "Fulano" },
                    email: { type: "string", example: "fulanoo@email.com" },
                }
            },
            Cadastro_Usuario: {
                type: "object",
                properties: {
                    nome: { type: "string", example: "Fulano" },
                    email: { type: "string", example: "fulanoo@email.com" },
                    senha: { type: "string", example: "2026" },
                }
            },
            Login_Usuario: {
                type: "object",
                required: ["email", "senha"],
                properties: {
                    email: { type: "string", example: "fulano@email.com" },
                    senha: { type: "string", example: "2026" }
                }
            },
            Resposta_Login: {
                type: "object",
                properties: {
                    message: { type: 'string', example: 'Login realizado com sucesso' },
                    token: {
                        type: 'string',
                        description: 'Token JWT gerado',
                        example: 'eyJhbGciOihjbiuihvfyuvh...'
                    },
                    usuario: {
                        type: 'object',
                        properties: {
                            id_usuario: { type: 'integer', example: 1 },
                            email: { type: "string", example: "gustavo@email.com" },
                            senha: { type: "string", example: "2026" }
                        }
                    }
                }
            },
            Mensagem_Chat: {
                type: "object",
                required: ["id_usuario", "mensagem"],
                properties: {
                    id_usuario: { type: "integer", example: 1 },
                    mensagem: { type: "string", example: "Como economizar dinheiro?" }
                }
            },
            Resposta_Chat: {
                type: "object",
                properties: {
                    id_chat: { type: "integer", example: 1 },
                    id_usuario: { type: "integer", example: 1 },
                    mensagem: { type: "string", example: "Como economizar dinheiro?" },
                    resposta: { type: "string", example: "Para economizar..." }
                }
            },
            Nova_Transacao: {
                type: "object",
                required: ["id_usuario", "valor", "tipo", "descricao"],
                properties: {
                    id_usuario: { type: "integer", example: 1 },
                    valor: { type: "number", format: "float", example: 150.50 },
                    tipo: { type: "string", example: "despesa" },
                    descricao: { type: "string", example: "Compra no mercado" }
                }
            },
            Atualizar_Transacao: {
                type: "object",
                description: "Campos atualizaveis de uma transação. IDs não podem ser alterados.",
                required: ["valor", "tipo", "descricao"],
                properties: {
                    valor: { type: "number", format: "float", example: 150.50 },
                    tipo: { type: "string", example: "despesa" },
                    descricao: { type: "string", example: "Compra no mercado" }
                }
            },
            Transacao: {
                type: "object",
                properties: {
                    id_transacao: { type: "integer", example: 1 },
                    id_usuario: { type: "integer", example: 1 },
                    valor: { type: "number", format: "float", example: 150.50 },
                    tipo: { type: "string", example: "despesa" },
                    descricao: { type: "string", example: "Compra no mercado" }
                }
            },
            Categoria: {
                type: "object",
                properties: {
                    id_categoria: { type: "integer", example: 1 },
                    nome: { type: "string", example: "Alimentação" },
                    tipo: { type: "string", example: "despesa" }
                }
            },
            Nova_Categoria: {
                type: "object",
                required: ["nome", "tipo"],
                properties: {
                    nome: { type: "string", example: "Alimentação" },
                    tipo: { type: "string", example: "despesa" }
                }
            },
            Subcategoria: {
                type: "object",
                properties: {
                    id_subcategoria: { type: "integer", example: 1 },
                    id_categoria: { type: "integer", example: 1 },
                    nome: { type: "string", example: "Supermercado" }
                }
            },
            Nova_Subcategoria: {
                type: "object",
                required: ["id_categoria", "nome"],
                properties: {
                    id_categoria: { type: "integer", example: 1 },
                    nome: { type: "string", example: "Supermercado" }
                }
            },
            Atualizar_Subcategoria: {
                type: "object",
                description: "Apenas o nome pode ser atualizado. IDs não podem ser alterados.",
                required: ["nome"],
                properties: {
                    nome: { type: "string", example: "Supermercado" }
                }
            }
        }
    }
}

export default swagger;