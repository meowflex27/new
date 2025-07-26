import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.5.1';

window.loadTransformers = async () => {
  window.transformerBot = await pipeline('text-generation', 'Xenova/distilgpt2');
};
loadTransformers();
