const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let clients = [];

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    clients.push(res);

    req.on('close', () => {
        clients = clients.filter(client => client !== res);
    });
});

function sendProgress(progress) {
    clients.forEach(client => {
        client.write(`data: ${JSON.stringify(progress)}\n\n`);
    });
}

app.post('/metadata', (req, res) => {
    const url = req.body.url;
    const command = 'yt-dlp';
    const args = ['--dump-json', url];

    const child = spawn(command, args);

    let outputData = '';

    child.stdout.on('data', (data) => {
        outputData += data;
    });

    child.stderr.on('data', (data) => {
        const str = data.toString();
        console.log(str); // Print stderr to the server console for debugging
    });

    child.on('close', (code) => {
        if (code !== 0) {
            res.status(500).send({ error: 'Failed to retrieve metadata!' });
        } else {
            try {
                const videoInfo = JSON.parse(outputData);
                const title = videoInfo.title;
                const thumbnail = videoInfo.thumbnail;

                res.json({ title, thumbnail });
            } catch (err) {
                res.status(500).send({ error: 'Failed to parse metadata!' });
            }
        }
    });

    child.on('error', (error) => {
        console.error(`exec error: ${error}`);
        res.status(500).send({ error: 'Failed to retrieve metadata!' });
    });
});

app.post('/download-file', (req, res) => {
    const url = req.body.url;
    const format = req.body.format || 'best';
    const title = req.body.title || 'video';
    const command = 'yt-dlp';
    const args = ['-f', format, '-o', '-', url];

    res.setHeader('Content-Disposition', `attachment; filename="${title}.mp4"`);
    res.setHeader('Content-Type', 'video/mp4');

    const child = spawn(command, args);

    child.stdout.pipe(res);

    child.on('error', (error) => {
        console.error(`exec error: ${error}`);
        res.status(500).send({ error: 'Download failed!' });
    });

    child.on('close', (code) => {
        if (code !== 0) {
            res.status(500).send({ error: 'Download failed!' });
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
