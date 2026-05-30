const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const TetrisEngine = require('./TetrisEngine');

if (isMainThread) {
    const numCPUs = require('os').cpus().length;
    const populationSize = 1000; // Increased population
    let population = [];
    let completed = 0;

    console.log(`🚀 Starting Multi-Core Tournament with ${numCPUs} worker threads...`);

    // 1. Create population
    for (let i = 0; i < populationSize; i++) {
        population.push({
            id: i,
            holes: Math.random() * 500,
            height: Math.random() * 100,
            pillars: Math.random() * 200,
            clear: Math.random() * 200,
            bumps: Math.random() * 100,
            fitness: 0
        });
    }

    // 2. Worker Dispatcher
    let index = 0;
    function launchWorker() {
        if (index >= populationSize) return;
        
        let dna = population[index];
        const worker = new Worker(__filename, { workerData: dna });
        
        worker.on('message', (score) => {
            dna.fitness = score;
            completed++;
            console.log(`[${completed}/${populationSize}] Individual ${dna.id} finished. Score: ${score}`);
            worker.terminate();
            launchWorker(); // Run next in queue
            
            if (completed === populationSize) finish();
        });
        index++;
    }

    // Launch initial batch
    for (let i = 0; i < Math.min(numCPUs, populationSize); i++) {
        launchWorker();
    }

    function finish() {
        population.sort((a, b) => b.fitness - a.fitness);
        console.log("\n🏆 --- TOP 5 EVOLVED MULTIPLIERS (BY SCORE * EFF) ---");
        population.slice(0, 5).forEach((top, i) => {
            console.log(`${i+1}. Fitness: ${top.fitness.toFixed(0)} | DNA: { holes: ${top.holes.toFixed(1)}, height: ${top.height.toFixed(1)}, bumps: ${top.bumps.toFixed(1)}, pillars: ${top.pillars.toFixed(1)}, clear: ${top.clear.toFixed(1)} }`);
        });
    }

} else {
    // --- WORKER THREAD LOGIC ---
    const dna = workerData;
    const game = new TetrisEngine(dna);
    let moves = 0;
    
    // Play until game over or move limit
    while (!game.game_over && moves < 5000) {
        game.step();
        moves++;
    }
    
    // Efficiency = (Score / (Lines Cleared * 300)) * 100
    const efficiency = game.lines_cleared > 0 ? (game.score / (game.lines_cleared * 300)) * 100 : 0;
    // Fitness = Score * Efficiency (Rewards both survival and quality)
    const fitness = game.score * efficiency;
    parentPort.postMessage(fitness);
}
