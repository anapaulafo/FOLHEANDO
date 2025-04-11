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

  res.json({
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    bio: usuario.bio
  });
});

// Rota de cadastro
app.post('/cadastro', async (req, res) => {
  const { username, nome, email, senha } = req.body;

  try {
    const novoUsuario = await prisma.user.create({
      data: { username, nome, email, senha }
    });

    res.json({
      id: novoUsuario.id,
      username: novoUsuario.username,
      nome: novoUsuario.nome,
      email: novoUsuario.email
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao cadastrar usuário' });
  }
});

// Rota para adicionar resenha
app.post('/resenhas', async (req, res) => {
  const { userId, livroId, status, nota, resenha, titulo, autor, imagem } = req.body;

  try {
    let livro = await prisma.livro.findUnique({ where: { id: livroId } });

    if (!livro) {
      livro = await prisma.livro.create({
        data: { id: livroId, titulo, autor, imagem }
      });
    } else if (!livro.imagem && imagem) {
      livro = await prisma.livro.update({
        where: { id: livroId },
        data: { imagem }
      });
    }

    const leituraExistente = await prisma.leitura.findUnique({
      where: {
        userId_livroId: {
          userId,
          livroId
        }
      }
    });

    if (leituraExistente) {
      return res.status(400).json({ erro: 'Você já adicionou uma resenha para este livro.' });
    }

    const novaLeitura = await prisma.leitura.create({
      data: {
        userId,
        livroId,
        status: status.toLowerCase(),
        nota,
        resenha
      }
    });

    res.json(novaLeitura);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao adicionar resenha', detalhes: error.message });
  }
});

// Rota para buscar resenhas de um livro
app.get('/resenhas/:idLivro', async (req, res) => {
  const idLivro = req.params.idLivro;

  try {
    const resenhas = await prisma.leitura.findMany({
      where: { livroId: idLivro },
      include: { user: true }
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
      include: { livro: true }
    });

    res.json(resenhas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao buscar resenhas do usuário' });
  }
});

// 🆕 Rota para editar nome e bio do usuário
app.put('/usuarios/:id', async (req, res) => {
  const id = req.params.id;
  const { nome, bio } = req.body;

  try {
    const usuarioAtualizado = await prisma.user.update({
      where: { id },
      data: {
        ...(nome && { nome }),
        ...(bio !== undefined && { bio })
      }
    });

    res.json(usuarioAtualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao atualizar usuário' });
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

// Rota para editar uma resenha existente
app.put('/resenhas/:id', async (req, res) => {
  const id = req.params.id;
  const { status, nota, resenha } = req.body;

  try {
    const resenhaAtualizada = await prisma.leitura.update({
      where: { id },
      data: {
        status: status.toLowerCase(),
        nota,
        resenha
      }
    });

    res.json(resenhaAtualizada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao editar resenha' });
  }
});

// Rota para excluir uma resenha
app.delete('/resenhas/:id', async (req, res) => {
  const id = req.params.id;

  try {
    await prisma.leitura.delete({
      where: { id }
    });

    res.json({ mensagem: 'Resenha excluída com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao excluir resenha' });
  }
});

// Rota para listar os livros com status "Quero ler" de um usuário
app.get('/leitura/usuario/:idUsuario', async (req, res) => {
  const idUsuario = req.params.idUsuario;

  try {
    const leituras = await prisma.leitura.findMany({
      where: {
        userId: idUsuario,
        status: 'nao_li'
      },
      include: {
        livro: true
      }
    });

    res.json(leituras);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao buscar lista de desejos do usuário' });
  }
});

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});

// Rota para buscar um usuário por ID
app.get('/usuarios/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const usuario = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        bio: true,
        foto: true  // <- Adicione isso!
      }
    });

    if (!usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao buscar usuário' });
  }
});


//UPLOAD DE FOTO
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Cria pasta se não existir
const pastaUploads = 'uploads';
if (!fs.existsSync(pastaUploads)) {
  fs.mkdirSync(pastaUploads);
}

// Configuração do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, pastaUploads);
  },
  filename: (req, file, cb) => {
    const extensao = path.extname(file.originalname);
    cb(null, `foto-${Date.now()}${extensao}`);
  }
});

const upload = multer({ storage });

// Rota para upload da foto
app.post('/upload-foto/:id', upload.single('foto'), async (req, res) => {
  const { id } = req.params;
  const urlFoto = `http://localhost:3000/uploads/${req.file.filename}`;


  try {
    const usuario = await prisma.user.update({
      where: { id },
      data: { foto: urlFoto }
    });

    res.json({ foto: usuario.foto });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao salvar a foto' });
  }
});

// Servir os arquivos da pasta uploads
app.use('/uploads', express.static('uploads'));
