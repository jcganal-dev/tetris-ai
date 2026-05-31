const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const TetrisEngine = require('./TetrisEngine');
const os = require('os');

const POPULATION_SIZE = 100;
const GENERATIONS = 1000;
const ELITE_COUNT = 10;
const MUTATION_RATE = 0.15; // 15% chance to mutate a gene
const MOVES_LIMIT = 7500;

if (isMainThread) {
    const numCPUs = os.cpus().length;
    let currentGeneration = 1;
    let population = [];

    // Initialize Population
    for (let i = 0; i < POPULATION_SIZE; i++) {
        population.push(createRandomDNA(i));
    }

    async function runGeneration() {
        console.log(`\n🧬 --- GENERATION ${currentGeneration}/${GENERATIONS} ---`);
        let completed = 0;
        let queue = [...population];
        let activeWorkers = 0;

        return new Promise((resolve) => {
            function launchNext() {
                if (completed === POPULATION_SIZE) {
                    resolve();
                    return;
                }

                while (activeWorkers < numCPUs && queue.length > 0) {
                    const dna = queue.shift();
                    activeWorkers++;
                    const worker = new Worker(__filename, { workerData: dna });

                    worker.on('message', (fitness) => {
                        dna.fitness = fitness;
                        completed++;
                        activeWorkers--;
                        process.stdout.write(`\rProgress: ${completed}/${POPULATION_SIZE} simulations done...`);
                        worker.terminate();
                        launchNext();
                    });
                }
            }
            launchNext();
        });
    }

    function createRandomDNA(id) {
        return {
            id: id,
            holes: Math.random() * 500,
            height: Math.random() * 100,
            pillars: Math.random() * 200,
            clear: Math.random() * 200,
            bumps: Math.random() * 100,
            fitness: 0
        };
    }

    function evolve() {
        // 1. Sort by fitness
        population.sort((a, b) => b.fitness - a.fitness);

        console.log(`\n🏆 Best Fitness: ${population[0].fitness.toFixed(0)}`);
        console.log(`Top DNA: { holes: ${population[0].holes.toFixed(1)}, height: ${population[0].height.toFixed(1)}, bumps: ${population[0].bumps.toFixed(1)}, pillars: ${population[0].pillars.toFixed(1)}, clear: ${population[0].clear.toFixed(1)} }`);

        // 2. Select Elites (Survival)
        const elites = population.slice(0, ELITE_COUNT);
        const nextPopulation = [...elites]; // Keep elites unchanged

        // 3. Fill the rest of the population
        while (nextPopulation.length < POPULATION_SIZE) {
            // Select two parents from elites
            const p1 = elites[Math.floor(Math.random() * elites.length)];
            const p2 = elites[Math.floor(Math.random() * elites.length)];
            
            // Crossover & Mutation
            nextPopulation.push(breed(p1, p2, nextPopulation.length));
        }

        population = nextPopulation;
        currentGeneration++;
    }

    function breed(p1, p2, newId) {
        const dna = { id: newId, fitness: 0 };
        const keys = ['holes', 'height', 'pillars', 'clear', 'bumps'];
        
        keys.forEach(key => {
            // Crossover: 50% chance from either parent
            let val = Math.random() > 0.5 ? p1[key] : p2[key];
            
            // Mutation: Random tweak
            if (Math.random() < MUTATION_RATE) {
                val += (Math.random() - 0.5) * (val * 0.4); // +/- 20% tweak
            }
            dna[key] = Math.max(0, val);
        });
        
        return dna;
    }

    async function start() {
        for (let g = 0; g < GENERATIONS; g++) {
            await runGeneration();
            evolve();
        }
        console.log("\n✅ EVOLUTION COMPLETE.");
        console.log("Final Top Multipliers:", population[0]);
    }

    start();

} else {
    // --- WORKER THREAD ---
    const dna = workerData;
    const game = new TetrisEngine(dna);
    let moves = 0;
    
    while (!game.game_over && moves < MOVES_LIMIT) {
        game.step();
        moves++;
    }
    
    const efficiency = game.lines_cleared > 0 ? (game.score / (game.lines_cleared * 300)) * 100 : 0;
    const fitness = game.score * efficiency;
    parentPort.postMessage(fitness);
}
