import jwt from 'jsonwebtoken';

/**
 * Middleware de autenticação JWT.
 * Verifica o token Bearer no header Authorization.
 * Se válido, injeta req.usuario com os dados do payload.
 */
export function autenticar(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer <TOKEN>"

    if (!token) {
        return res.status(401).json({
            message: 'Acesso negado. Token não fornecido. Faça login para continuar.'
        });
    }

    try {
        const secret = process.env.JWT_SECRET || 'chave_hksdjfh_default';
        const decoded = jwt.verify(token, secret);
        req.usuario = decoded; // disponibiliza { id, email } nas rotas
        next();
    } catch (error) {
        return res.status(403).json({
            message: 'Token inválido ou expirado. Faça login novamente.'
        });
    }
}
