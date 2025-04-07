import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Rota de login
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  const usuario = await prisma.user.findUnique({
    where: { email }
  });

  if (!usuario || usuario.senha !== senha) {
    return res.status(401).json({ erro: 'Email ou senha inválidos' });
  }

  res.json({ id: usuario.id, nome: usuario.nome, email: usuario.email });
});

// Rota de cadastro
app.post('/cadastro', async (req, res) => {
    const { username, nome, email, senha } = req.body;
  
    try {
      const novoUsuario = await prisma.user.create({
        data: {
          username,
          nome,
          email,
          senha
        }
      });
      res.json({ id: novoUsuario.id, username: novoUsuario.username, nome: novoUsuario.nome, email: novoUsuario.email });
    } catch (error) {
      console.error(error);
      res.status(500).json({ erro: 'Erro ao cadastrar usuário' });
    }
  });
  
// Rota para adicionar resenha
app.post('/resenhas', async (req, res) => {
  const { userId, livroId, status, nota, resenha, titulo, autor } = req.body;

  try {
    const leituraExistente = await prisma.leitura.findFirst({
      where: {
        livroId: livroId,
        userId: userId
      }
    });

    if (leituraExistente) {
      return res.status(400).json({ erro: 'Você já adicionou uma resenha para este livro.' });
    }

    // Se o livro ainda não existir no banco, cria
    let livro = await prisma.livro.findUnique({
      where: { id: livroId }
    });

    if (!livro) {
      livro = await prisma.livro.create({
        data: {
          id: livroId,
          titulo,
          autor
        }
      });
    }

    // Cria a resenha
    const novaLeitura = await prisma.leitura.create({
      data: {
        userId,
        livroId,
        status,
        nota,
        resenha
      }
    });

    res.json(novaLeitura);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao adicionar resenha' });
  }
});

// Rota para buscar resenhas de um livro
app.get('/resenhas/:idLivro', async (req, res) => {
  const idLivro = req.params.idLivro;

  try {
    const resenhas = await prisma.leitura.findMany({
      where: { livroId: idLivro },
      include: {
        user: true
      }
    });

    res.json(resenhas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao buscar resenhas' });
  }
});

// Rota para buscar todas as resenhas de um usuário
app.get('/resenhas-usuario/:idUsuario', async (req, res) => {
  const idUsuario = req.params.idUsuario;

  try {
    const resenhas = await prisma.leitura.findMany({
      where: { userId: idUsuario },
      include: {
        livro: true
      }
    });

    res.json(resenhas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao buscar resenhas do usuário' });
  }
});

// Rota para editar a bio do usuário
app.put('/usuarios/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { bio } = req.body;

  try {
    const usuarioAtualizado = await prisma.user.update({
      where: { id },
      data: { bio }
    });

    res.json(usuarioAtualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao atualizar a bio' });
  }
});

// Rota para buscar livros da API do Google
app.get('/buscar-livros', async (req, res) => {
  const termo = req.query.q;

  try {
    const resposta = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(termo)}`);
    const dados = await resposta.json();

    const livros = dados.items.map(item => ({
      idGoogle: item.id,
      titulo: item.volumeInfo.title,
      autores: item.volumeInfo.authors || [],
      descricao: item.volumeInfo.description || '',
      imagem: item.volumeInfo.imageLinks?.thumbnail || ''
    }));

    res.json(livros);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar livros na API do Google' });
  }
});

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});

// Rota para listar todos os usuários
app.get('/usuarios', async (req, res) => {
    try {
      const usuarios = await prisma.user.findMany();
      res.json(usuarios);
    } catch (error) {
      console.error(error);
      res.status(500).json({ erro: 'Erro ao buscar usuários' });
    }
  });
  