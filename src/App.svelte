<script>
import { onMount } from 'svelte';

import Dove from './Dove.svelte';

let acheived = 0;
let away = 0;
let isDoveActive = true;
let time = 0;
let timer = "00:00:00";
let level = 1;
let speed = 15;
let interval;
const lap = 30;

function handleShoot() {
	acheived++;
	renderNewDove();
}

function renderNewDove() {
	isDoveActive = false;
	setTimeout(() => {
		isDoveActive = true;
	}, 1000)
}
let box;
let boundary;

onMount(() => {
	boundary = box && box.getBoundingClientRect();
})

function handleAway() {
	away++;
	renderNewDove();
}

function doGameOver() {
	clearInterval(interval)
}

interval = setInterval(() => {
	time++;
	timer = new Date(time * 1000).toISOString().substr(11, 8);
	if (time % lap === 0) {
		level++
		if(speed !== 0) {
			speed--;
		} else {
			doGameOver()
		}
	}
}, 1000);

</script>

<style>
	.wrap {
		display: flex;
		height: 100vh;
		display: flex;
	}
	.box {
		overflow: hidden;
		background-color: skyblue;
		border: 1px solid gray;
		margin: 1rem;
		width: 100%;
		background-image: url("./assets/clouds.png");
		background-size: cover;
   		background-position: center center;
		position: relative;
		cursor: move ;
	}

	.score {
		margin: 1rem;
		padding: .5rem;
		background: green;
		position: absolute;
		right: 0;
		top: 0;
		color: white;
	}

	.away {
		margin: 1rem;
		padding: .5rem;
		background: red;
		position: absolute;
		left: 0;
		top: 0;
		color: white;
	}

	.time {
		margin: 1rem;
		padding: .5rem;
		background: white;
		position: absolute;
		left: calc(50% - 50px);
		top: 0;
		color: black;
	}

	.completed {
		margin: 1rem;
		padding: .5rem;
		background: red;
		position: absolute;
		left: calc(50% - 50px);
		top: calc(50% - 6rem);
		color: black;
		font-size: 6rem;
	}

</style>

<div class="wrap">
	<div id="box" class="box target-cursor" bind:this={box}>
		<div class="time">{ timer } level: {level}</div>
		{#if acheived} <div class="score">you have shot {acheived} dove{#if acheived !== 1}s{/if}!</div> {/if}
		{#if away} <div class="away">{away} dove{#if away !== 1}s{/if} have gone already!</div> {/if}
		
		{#if speed > 0}
			{#if isDoveActive && boundary}<Dove on:shoot={handleShoot} bind:boundary={boundary} on:away={handleAway} bind:speed={speed} />{/if}
		{:else} 
			<div class="completed">GAME OVER</div>
		{/if}
	
		
	</div>
</div>
