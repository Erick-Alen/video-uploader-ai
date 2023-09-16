import { fastifyMultipart } from '@fastify/multipart';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import { prisma } from '../lib/prisma';

const pump = promisify(pipeline)
export async function uploadVideo(app:FastifyInstance) {
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 1_048_576 * 25,
    }
  })
  app.post('/videos', async (req, res) => {
    const data = await req.file()
    if (!data) {
      res.status(400).send({ error: 'No file uploaded' })
    }
    // @ts-ignore
    const extension = path.extname(data.filename)

    if (extension !== '.mp3') {
      res.status(400).send({ error: 'Invalid file type, upload a mp3' })
    }
    console.log('data', data)
    // @ts-ignore
    const fileBaseName = path.basename(data.filename, extension)
    const fileUploadName = `${fileBaseName}-${randomUUID()}${extension}`

    const uploadPath = path.resolve(__dirname, '../../temp', fileUploadName)

    // @ts-ignore
    await pump(data.file, fs.createWriteStream(uploadPath))

    const video = await prisma.video.create({
      data: {
        // @ts-ignore
        name: data.filename,
        path: uploadPath,
      }
    })
    return {
      video
    }
  })
}
