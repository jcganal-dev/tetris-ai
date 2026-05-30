function check_for_collision_PURE(x, y, r, name, board_to_check=board) {
    let shape = piece_rotations[name][r];
    for (let block of shape) {
        let tx = x + block[0];
        let ty = y + block[1];
        if (tx < 0 || tx >= columns || ty >= rows) {
            return true;
        }
        if (piece_names_permanent.includes(board_to_check[ty*columns+tx])) {
            return true; 
        }
    }
    return false;
}

function execute_move(instruction) {
    if (instruction==='L') {
        move(-1,0)
    }
    else if (instruction==='R') {
        move(1,0)
    }
    else if (instruction==='U') {
        rotate(2)
    }
    else if (instruction==='Z') {
        rotate(-1)
    }
    else if (instruction==='D') {
        move(0,1)
    }
    else if (instruction==='X') {
        rotate(1)
    }
    else if (instruction==='C') {
        hold()
    }
    else if (instruction===' ') {
        while(!check_for_collision(0,1,active_piece[0])) {
            move(0,1)
        }
        lock_piece()
        spawn_piece()
    }
}

function generate_all_paths(piece_name) {
    let piece = pieces[piece_name]
    let queue = [{x:piece[1][0],y:piece[1][1],r:0,path:[]}]
    let visited_states = new Set()
    let possible_landings = []

    while(queue.length>0) {
        let item = queue.shift()

        current_state = (item.x<<16) | (item.y<<8) | item.r

        if (visited_states.has(current_state)) continue;
        visited_states.add(current_state)

        // 3. Try every move a player can make
        let moves = [
            { nx: -1, ny: 0, nr: 0,  key: 'L' }, // Left
            { nx: 1,  ny: 0, nr: 0,  key: 'R' }, // Right
            { nx: 0,  ny: 1, nr: 0,  key: 'D' }, // Down
            { nx: 0,  ny: 0, nr: 1,  key: 'X' }, // Rotate Right
            { nx: 0,  ny: 0, nr: -1, key: 'Z' }, // Rotate Left
            { nx: 0,  ny: 0, nr: 2,  key: 'U' } // Flip
        ];
        for (let move of moves) {
            let next_x = item.x + move.nx;
            let next_y = item.y + move.ny;
            let next_r = (item.r + move.nr + 4) % 4; // Assuming 4 rotations
            // Check if this specific rotation/position hits the board
            if (!check_for_collision_PURE(next_x, next_y, next_r, piece_name)) {
                queue.push({
                    x: next_x,
                    y: next_y,
                    r: next_r,
                    path: [...item.path, move.key]
                });
            } else {
                if (move.key === 'D') {
                    possible_landings.push(item);
                }
            }
        }
    }
    return possible_landings
}

function simulate_clear_rows(board_to_check) {
    let temp = board_to_check.slice();
    let cleared = 0;
    for (let y = rows - 1; y >= 0; y--) {
        let isFull = true;
        for (let x = 0; x < columns; x++) {
            if (temp[y * columns + x] === blank) {
                isFull = false;
                break;
            }
        }
        if (isFull) {
            temp.splice(y * columns, columns);
            cleared += 1;
        }
    }
    // Prepend new blank rows
    if (cleared > 0) {
        temp = new Array(cleared * columns).fill(blank).concat(temp);
    }
    return [temp, cleared];
}

function simulate_paths(all_paths,piece_name) {
    let best_path = []
    let min_cost = null
    let temp_board = board.slice()
    for (let i=0;i<all_paths.length;i++) {
        let state = all_paths[i]
        let spx = state.x
        let spy = state.y
        let r = state.r
        let shape = piece_rotations[piece_name][r]
        let height = spy
        for(let b=0;b<shape.length;b++) {
            let [x,y] = shape[b]
            height = Math.min(height,spy+y)
            let target_index = (spy+y)*columns+(spx+x)
            temp_board[target_index] = piece_name.toLowerCase()
        }
        let [processed_board, line_clears] = simulate_clear_rows(temp_board)
        let [holes,pillars] = calculate_pillars(processed_board)
        let bumps = calculate_bumpyness(processed_board)
        clears = holes===0&&line_clears<4?line_clears:-line_clears
        height = rows-height
        let cost = holes*multipliers.holes + (height*(height/8))*multipliers.height + pillars*multipliers.pillars + clears*multipliers.clear + bumps*multipliers.bumps
        if (i==0) {
            min_cost = cost
            best_path = state.path
        } else {
            if (cost<min_cost) {
                min_cost = cost
                best_path = state.path
            }
        }
        for(let b=0;b<shape.length;b++) {
            let [x,y] = shape[b]
            let target_index = (spy+y)*columns+(spx+x)
            temp_board[target_index] = blank
        }
    }
    return {path:best_path,cost:min_cost}
}

function start_AI() {
    let all_paths = generate_all_paths(active_piece_name)
    let result = simulate_paths(all_paths,active_piece_name)
    let result_held = {cost: Infinity}
    if (held_piece!==null) {
        let all_paths_held = generate_all_paths(held_piece_name)
        result_held = simulate_paths(all_paths_held,held_piece_name)
    }
    if (result.cost>result_held.cost) {
        best_path = ['C'].concat(result_held.path)
    } else {
        best_path = result.path
    }
}