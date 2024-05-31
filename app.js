document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.tab');
    const form = document.getElementById('download-form');
    const resultDiv = document.getElementById('result');
    const progressDiv = document.getElementById('progress');
    const thumbnailImg = document.getElementById('thumbnail');
    let activeTab = 'youtube';

    const API_KEY = '2f8a8e6f4c7b5a3d4e7f8b9c1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0'; // Replace with your actual API key

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeTab = tab.getAttribute('data-tab');
            resultDiv.innerHTML = '';
            progressDiv.innerHTML = '';
            thumbnailImg.style.display = 'none';
        });
    });

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const url = document.getElementById('url').value;
        const format = document.getElementById('format').value;
        resultDiv.innerHTML = '';
        progressDiv.innerHTML = 'Fetching metadata...';
        thumbnailImg.style.display = 'none';

        try {
            console.log('Sending API Key:', API_KEY); // Log the API key
            const metadataResponse = await fetch('http://134.122.91.143/api/metadata', { // Update with your IP address and endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY
                },
                body: JSON.stringify({
                    url: url
                })
            });

            if (!metadataResponse.ok) {
                throw new Error(`Error fetching metadata: ${metadataResponse.statusText}`);
            }

            const metadata = await metadataResponse.json();

            if (!metadata || metadata.error) {
                resultDiv.innerHTML = `<p>Error: ${metadata?.error || 'Unknown error'}</p>`;
                return;
            }

            const { title, thumbnail } = metadata;
            thumbnailImg.src = thumbnail;
            thumbnailImg.style.display = 'block';
            resultDiv.innerHTML = `<p>Title: ${title}</p>`;

            const eventSource = new EventSource('/events');
            eventSource.onmessage = function(event) {
                const progress = JSON.parse(event.data).progress;
                progressDiv.innerHTML = `Download progress: ${progress.toFixed(2)}%`;
            };

            const downloadResponse = await fetch('http://134.122.91.143/api/download-file', { // Update with your IP address and endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': API_KEY
                },
                body: JSON.stringify({
                    url: url,
                    format: format,
                    title: title
                })
            });

            if (!downloadResponse.ok) {
                const errorData = await downloadResponse.json();
                throw new Error(`Error downloading file: ${errorData.error}`);
            }

            const blob = await downloadResponse.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            a.download = `${title}.mp4`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            resultDiv.innerHTML = 'Download complete.';
            eventSource.close();
        } catch (error) {
            console.error('Error:', error);
            resultDiv.innerHTML = `<p>Error: ${error.message}</p>`;
        }
    });
});