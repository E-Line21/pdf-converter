import { createRequire } from "module";
import Canvas from "canvas";
const require = createRequire(import.meta.url);
const cors = require("cors")
const express = require('express')
const app = express()
const port = 3021
import * as pdf from 'pdfjs-dist';
import {DOMMatrix} from "canvas";

globalThis.DOMMatrix = DOMMatrix;

app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

console.log(`api url: ${process.env.API_URL}`);

app.get("/", (req, res) => {
    res.send("Hello from pdf converter");
})

app.get('/parse/stream', async (req, res) => {
    const fileId = req.query.id;
    if (!fileId) {
        return res.status(400).send('File ID is missing');
    }

    const pdfDocument = await getPdfDocumentFromId(fileId);
    const totalPages = pdfDocument.numPages;

    res.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, PUT, POST, DELETE",
        "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, X-Total-Pages",
        'Access-Control-Expose-Headers': 'X-Total-Pages',
        'X-Total-Pages': totalPages,
        'Content-Type': "text/plain",
        "Transfer-Encoding": 'chunked',
    })

    const start = new Date().getTime();
    for (let page = 1; page <= totalPages; page++) {
        const imageAsDataUrl = await getImageAsDataUrl(pdfDocument, page);
        //console.log(`page ${page} ready in ${new Date().getTime() - start}ms`)
        res.write(imageAsDataUrl + "\n");
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    res.end();
});

class NodeCanvasFactory {
    create(width, height) {
        const canvas = Canvas.createCanvas(width, height);
        const context = canvas.getContext("2d");
        return {
            canvas,
            context,
        };
    }

    reset(canvasAndContext, width, height) {
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
    }

    destroy(canvasAndContext) {
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
        canvasAndContext.canvas = null;
        canvasAndContext.context = null;
    }
}

function getPdfDocumentFromId(fileId) {
    return getPdfFileAsArrayBuffer(fileId).then(arrayBuffer => getPdfDocumentFromArrayBuffer(arrayBuffer))
}

function getPdfFileAsArrayBuffer(fileId) {
    return fetch(`${process.env.API_URL}/storage/${fileId}`, {
        method: "GET",
    }).then(value => value.blob()).then(value => value.arrayBuffer());
}

function getPdfDocumentFromArrayBuffer(arrayBuffer) {
    const CMAP_URL = "./node_modules/pdfjs-dist/cmaps/";
    const CMAP_PACKED = true;

    const STANDARD_FONT_DATA_URL =
        "./node_modules/pdfjs-dist/standard_fonts/";
    return pdf.getDocument({data: arrayBuffer, cMapUrl :CMAP_URL, cMapPacked: CMAP_PACKED, standardFontDataUrl: STANDARD_FONT_DATA_URL}).promise;
}

function getImageAsDataUrl(pdfDocument, pageNum) {
    return new Promise(async (resolve, reject) => {
        const canvasFactory = new NodeCanvasFactory();
        try {
            const page = await pdfDocument.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvasAndContext = canvasFactory.create(
                viewport.width,
                viewport.height
            );
            const renderContext = {
                canvasContext: canvasAndContext.context,
                viewport,
            };

            const renderTask = page.render(renderContext);
            await renderTask.promise;
            let imageAsDataUrl = canvasAndContext.canvas.toDataURL();
            page.cleanup();
            resolve(imageAsDataUrl);
        } catch (reason) {
            reject(reason);
        }
    })
}



app.listen(port, () => {
    console.log(`Pdf converter listening on port ${port}`)
})