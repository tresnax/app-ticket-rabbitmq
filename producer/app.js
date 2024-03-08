const express = require('express');
const bodyParser = require('body-parser');
const amqp = require('amqplib');

const app = express();
const port = 3000;

const exchangeName = 'pendaftaran';
const exchangeType = 'fanout';
const mqConnectionURL = 'amqp://devops:tahubulat@localhost:5672/';

app.use(bodyParser.json());

// Definisi route untuk mengirim nomor antrian ke RabbitMQ
app.post('/kirim-antrian', async (req, res) => {
  const { nomorAntrian } = req.body;

  if (!nomorAntrian) {
    return res.status(400).json({ error: 'Nomor antrian tidak valid' });
  }

  try {
    // Membuat koneksi ke RabbitMQ
    const connection = await amqp.connect(mqConnectionURL);
    const channel = await connection.createChannel();

    // Mendeklarasikan exchange
    await channel.assertExchange(exchangeName, exchangeType, { durable: true });

    // Mengirim nomor antrian ke exchange tanpa routing key (fanout)
    channel.publish(exchangeName, '', Buffer.from(nomorAntrian.toString()));

    console.log(`Nomor antrian ${nomorAntrian} berhasil mendaftar`);

    // Menutup koneksi
    setTimeout(() => {
      connection.close();
    }, 500);

    return res.status(200).json({ message: 'Nomor antrian berhasil didaftarkan' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan internal' });
  }
});


app.get('/next-admin/:queueName', async (req, res) => {
  try {

    const { queueName } = req.params;

    // Mapping antara parameter dan nama antrian yang sesuai
    const queueMappings = {
      admin: 'administrasi',
      perawat: 'perawat',
      dokter: 'dokter',
      obat: 'obat',
    };

    const selectedQueue = queueMappings[queueName];

    if (!selectedQueue) {
      return res.status(400).send('Parameter antrian tidak valid');
    }

    const connection = await amqp.connect(mqConnectionURL);
    const channel = await connection.createChannel();

    try {
      // Deklarasikan antrian jika belum ada
      await channel.assertQueue(selectedQueue, { durable: true , arguments: { 'x-queue-type': 'quorum' }});
  
      // Mengonsumsi satu pesan dari antrian
      const message = await channel.get(selectedQueue, { noAck: false });
  
      if (message !== false) {
        const queueData = message.content.toString();
        console.log(`Antrian ${selectedQueue} No: ${queueData}`);
        res.send(`Antrian ${selectedQueue} No: ${queueData}`);
  
        // Acknowledge penerimaan pesan
        channel.ack(message);
      } else {
        console.log('Antrian sudah kosong');
        res.send('Antrian sudah kosong');

      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      // Tutup koneksi setelah selesai atau pada error
      await channel.close();
      await connection.close();
    }
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});



// Menjalankan server Express
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
