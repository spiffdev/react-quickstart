// jsdom has no canvas, and importing the platform's packages probes for one. Saying there isn't one is enough.
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
