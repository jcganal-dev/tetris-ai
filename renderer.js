const color_dict = {
    ' ':'#28282B',
    'P' : 'gray',
    'L':'rgba(255, 170, 0, 1)',
    'J':'rgba(0, 0, 255, 1)',
    'O':'rgba(255, 255, 0, 1)',
    'S':'rgba(0, 255, 0, 1)',
    'Z':'rgba(255, 0, 0, 1)',
    'T':'rgba(153, 0, 255, 1)',
    'I':'rgba(0, 255, 255, 1)',
    'grid':'#111111'
}

const shape_dict = {
    'L':[
        [0,0,1],
        [1,1,1],
        [0,0,0]
    ],
    'J':[
        [1,0,0],
        [1,1,1],
        [0,0,0]
    ],
    'O':[
        [1,1,],
        [1,1,]
    ],
    'S':[
        [0,1,1],
        [1,1,0],
        [0,0,0]
    ],
    'Z':[
        [1,1,0],
        [0,1,1],
        [0,0,0]
    ],
    'T':[
        [0,1,0],
        [1,1,1],
        [0,0,0]
    ],
    'I':[
        [0,0,0,0],
        [1,1,1,1],
        [0,0,0,0],
        [0,0,0,0]
        ],
    '':[
        []
    ]
}

const canvas = document.getElementById('board');
const canvas_ctx = canvas.getContext('2d');
const next = document.getElementById('next_canvas');
const next_ctx = next.getContext('2d');
const held = document.getElementById('held_canvas');
const held_ctx = held.getContext('2d');
canvas_ctx.strokeStyle = color_dict['grid'];
canvas_ctx.lineWidth = 2;
for (let i = 0;i<=10;i++) {
    canvas_ctx.moveTo(40*i, 0);
    canvas_ctx.lineTo(40*i, 800);
}
for (let i = 0;i<=20;i++) {
    canvas_ctx.moveTo(0, 40*i);
    canvas_ctx.lineTo(400, 40*i);
}
canvas_ctx.stroke();

function update_board_canvas() {
    for(let y = 0;y<20;y++) {
        for (let x= 0;x<10;x++) {
            let cell = board[((y+4)*columns)+x];
            canvas_ctx.fillStyle = color_dict[game_over&&piece_names.includes(cell.toUpperCase())?'P':cell.toUpperCase()] || color_dict[' '];
            canvas_ctx.fillRect(x*40+1, y*40+1, 38, 38);
        }
    }

    let [prev_shape, [prev_spx, prev_spy]] = preview_piece;
    canvas_ctx.globalAlpha = 0.3;
    prev_shape.forEach(block => {
        canvas_ctx.fillStyle = color_dict[active_piece_name];
        canvas_ctx.fillRect((prev_spx+block[0])*40+1, (prev_spy-4+block[1])*40+1, 38, 38);
    });
    canvas_ctx.globalAlpha = 1.0;

    let [shape, [spx, spy]] = active_piece;
    shape.forEach(block => {
        canvas_ctx.fillStyle = color_dict[game_over?'P':active_piece_name];
        canvas_ctx.fillRect((spx+block[0])*40+1, (spy-4+block[1])*40+1, 38, 38);
    });

    let next_piece = shape_dict[seven_bag[0]]
    next.width = next_piece.length*40
    next.height = next_piece.length*40
    for(let y = 0;y<next_piece.length;y++) {
        for(let x=0;x<next_piece[y].length;x++) {
            if (next_piece[y][x]===1) {
                next_ctx.fillStyle = color_dict['grid']
                next_ctx.fillRect(x*40, y*40, 40, 40);
                next_ctx.fillStyle = color_dict[seven_bag[0]]
                next_ctx.fillRect(x*40+1, y*40+1, 38, 38);
            }
        }
    }

    if (held_piece_name===null) return
    let held_piece = shape_dict[held_piece_name]
    held.width = held_piece.length*40
    held.height = held_piece.length*40
    for(let y = 0;y<held_piece.length;y++) {
        for(let x=0;x<held_piece[y].length;x++) {
            if (held_piece[y][x]===1) {
                held_ctx.fillStyle = color_dict['grid']
                held_ctx.fillRect(x*40, y*40, 40, 40);
                held_ctx.fillStyle = color_dict[held_piece_name]
                held_ctx.fillRect(x*40+1, y*40+1, 38, 38);
            }
        }
    }
}