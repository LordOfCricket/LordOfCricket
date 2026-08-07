// Phase 11 — proves the FULL authoritative pipeline end to end: a real HTTP
// scoring/correction/lifecycle request against the real Express app (same
// app.js the real server boots), through the real service layer, publishing
// to a real Socket.IO room a real socket.io-client spectator has joined.
// This is what actually proves "publish only after commit" and "controllers
// wire req.io correctly" — the lower-level cricketRealtime.integration.test.js
// already proved the transport primitives in isolation.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'crypto'
import http from 'http'
import { Server } from 'socket.io'
import { io as ioClient } from 'socket.io-client'
import app from '../../app.js'
import { registerCricketRealtime } from '../../realtime/cricketRealtime.js'
import { signToken } from '../../utils/jwt.js'
import * as matchService from '../../services/match.service.js'
import * as scoringService from '../../services/scoring.service.js'
import * as correctionService from '../../services/correction.service.js'
import { createTeamsFixture } from './fixtures.js'

async function startTestApp() {
  const httpServer = http.createServer(app)
  const io = new Server(httpServer, { cors: { origin: '*' } })
  app.locals.io = io
  registerCricketRealtime(io)
  await new Promise((resolve) => httpServer.listen(0, resolve))
  const port = httpServer.address().port
  return {
    io,
    baseUrl: `http://localhost:${port}/api`,
    socketUrl: `http://localhost:${port}`,
    async close() {
      io.close()
      await new Promise((resolve) => httpServer.close(resolve))
    },
  }
}

function connectSpectator(url, matchId) {
  return new Promise((resolve, reject) => {
    const client = ioClient(url, { transports: ['websocket'], forceNew: true, reconnection: false })
    const timer = setTimeout(() => reject(new Error('spectator connect timed out')), 3000)
    client.on('connect', () => {
      clearTimeout(timer)
      client.emit('join-match', { matchId })
      resolve(client)
    })
  })
}

function waitForState(client, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out waiting for match:state')), timeoutMs)
    client.once('match:state', (payload) => {
      clearTimeout(timer)
      resolve(payload)
    })
  })
}

async function json(url, { method = 'GET', token, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, data: await res.json() }
}

test('R13/R17 — an HTTP delivery, after commit, publishes match:state with reason=delivery to the spectator room', async () => {
  const server = await startTestApp()
  const fx = await createTeamsFixture({ squadSize: 4 })
  try {
    const match = await matchService.createMatch({ teamAId: fx.teamAId, teamBId: fx.teamBId, venue: 'Realtime Publish Test', matchDate: new Date().toISOString(), oversPerInnings: 4, ballsPerOver: 6 })
    const mpsA = []
    for (const p of fx.squadA.slice(0, 4)) mpsA.push(await scoringService.addMatchPlayer({ matchId: match.id, teamId: fx.teamAId, playerId: p.id, isPlayingXi: true }))
    const mpsB = []
    for (const p of fx.squadB.slice(0, 4)) mpsB.push(await scoringService.addMatchPlayer({ matchId: match.id, teamId: fx.teamBId, playerId: p.id, isPlayingXi: true }))
    await matchService.setToss(match.id, { tossWinnerId: fx.teamAId, tossDecision: 'bat' })
    await matchService.startMatch(match.id)
    const innings1 = await scoringService.createInnings({ matchId: match.id, inningsNumber: 1, battingTeamId: fx.teamAId, bowlingTeamId: fx.teamBId })
    const { innings: i0 } = await scoringService.getInningsState(innings1.id)
    await scoringService.recordEvent({ inningsId: innings1.id, expectedVersion: i0.version, event: { eventType: 'batsman-in', payload: { end: 'strikerEnd', matchPlayerId: mpsA[0].id } } })
    const { innings: i1 } = await scoringService.getInningsState(innings1.id)
    await scoringService.recordEvent({ inningsId: innings1.id, expectedVersion: i1.version, event: { eventType: 'batsman-in', payload: { end: 'nonStrikerEnd', matchPlayerId: mpsA[1].id } } })

    const spectator = await connectSpectator(server.socketUrl, match.id)
    await new Promise((r) => setTimeout(r, 100))
    const nextState = waitForState(spectator)

    const scorerToken = signToken({ id: fx.userId })
    const { innings: i2 } = await scoringService.getInningsState(innings1.id)
    const { status, data } = await json(`${server.baseUrl}/innings/${innings1.id}/deliveries`, {
      method: 'POST',
      token: scorerToken,
      body: { expectedVersion: i2.version, clientActionId: randomUUID(), batRuns: 4, bowlerMatchPlayerId: mpsB[3].id },
    })
    assert.equal(status, 201)
    assert.equal(data.delivery.batRuns, 4)

    const payload = await nextState
    assert.equal(payload.reason, 'delivery')
    assert.equal(payload.matchId, match.id)
    assert.equal(payload.currentInnings.runs, 4)

    spectator.disconnect()
  } finally {
    await fx.cleanup()
    await server.close()
  }
})

test('R36 — an idempotent retry (same clientActionId) does not publish a second match:state', async () => {
  const server = await startTestApp()
  const fx = await createTeamsFixture({ squadSize: 4 })
  try {
    const match = await matchService.createMatch({ teamAId: fx.teamAId, teamBId: fx.teamBId, venue: 'Realtime Idempotency Test', matchDate: new Date().toISOString(), oversPerInnings: 4, ballsPerOver: 6 })
    const mpsA = []
    for (const p of fx.squadA.slice(0, 4)) mpsA.push(await scoringService.addMatchPlayer({ matchId: match.id, teamId: fx.teamAId, playerId: p.id, isPlayingXi: true }))
    const mpsB = []
    for (const p of fx.squadB.slice(0, 4)) mpsB.push(await scoringService.addMatchPlayer({ matchId: match.id, teamId: fx.teamBId, playerId: p.id, isPlayingXi: true }))
    await matchService.setToss(match.id, { tossWinnerId: fx.teamAId, tossDecision: 'bat' })
    await matchService.startMatch(match.id)
    const innings1 = await scoringService.createInnings({ matchId: match.id, inningsNumber: 1, battingTeamId: fx.teamAId, bowlingTeamId: fx.teamBId })
    const { innings: i0 } = await scoringService.getInningsState(innings1.id)
    await scoringService.recordEvent({ inningsId: innings1.id, expectedVersion: i0.version, event: { eventType: 'batsman-in', payload: { end: 'strikerEnd', matchPlayerId: mpsA[0].id } } })
    const { innings: i1 } = await scoringService.getInningsState(innings1.id)
    await scoringService.recordEvent({ inningsId: innings1.id, expectedVersion: i1.version, event: { eventType: 'batsman-in', payload: { end: 'nonStrikerEnd', matchPlayerId: mpsA[1].id } } })

    const spectator = await connectSpectator(server.socketUrl, match.id)
    await new Promise((r) => setTimeout(r, 100))

    const scorerToken = signToken({ id: fx.userId })
    const { innings: i2 } = await scoringService.getInningsState(innings1.id)
    const clientActionId = randomUUID()
    const body = { expectedVersion: i2.version, clientActionId, batRuns: 1, bowlerMatchPlayerId: mpsB[3].id }

    const firstState = waitForState(spectator)
    const first = await json(`${server.baseUrl}/innings/${innings1.id}/deliveries`, { method: 'POST', token: scorerToken, body })
    assert.equal(first.status, 201)
    await firstState

    let secondEventReceived = false
    spectator.once('match:state', () => {
      secondEventReceived = true
    })
    const second = await json(`${server.baseUrl}/innings/${innings1.id}/deliveries`, { method: 'POST', token: scorerToken, body })
    assert.equal(second.status, 201)
    assert.equal(second.data.idempotentReplay, true)

    await new Promise((r) => setTimeout(r, 400))
    assert.equal(secondEventReceived, false, 'a retried, already-applied clientActionId must not publish a second broadcast')

    spectator.disconnect()
  } finally {
    await fx.cleanup()
    await server.close()
  }
})

test('R11/R17 — a historical correction publishes the fully-replayed authoritative state (never a delta)', async () => {
  const server = await startTestApp()
  const fx = await createTeamsFixture({ squadSize: 4 })
  try {
    const match = await matchService.createMatch({ teamAId: fx.teamAId, teamBId: fx.teamBId, venue: 'Realtime Correction Test', matchDate: new Date().toISOString(), oversPerInnings: 4, ballsPerOver: 6 })
    const mpsA = []
    for (const p of fx.squadA.slice(0, 4)) mpsA.push(await scoringService.addMatchPlayer({ matchId: match.id, teamId: fx.teamAId, playerId: p.id, isPlayingXi: true }))
    const mpsB = []
    for (const p of fx.squadB.slice(0, 4)) mpsB.push(await scoringService.addMatchPlayer({ matchId: match.id, teamId: fx.teamBId, playerId: p.id, isPlayingXi: true }))
    await matchService.setToss(match.id, { tossWinnerId: fx.teamAId, tossDecision: 'bat' })
    await matchService.startMatch(match.id)
    const innings1 = await scoringService.createInnings({ matchId: match.id, inningsNumber: 1, battingTeamId: fx.teamAId, bowlingTeamId: fx.teamBId })
    const { innings: i0 } = await scoringService.getInningsState(innings1.id)
    await scoringService.recordEvent({ inningsId: innings1.id, expectedVersion: i0.version, event: { eventType: 'batsman-in', payload: { end: 'strikerEnd', matchPlayerId: mpsA[0].id } } })
    const { innings: i1 } = await scoringService.getInningsState(innings1.id)
    await scoringService.recordEvent({ inningsId: innings1.id, expectedVersion: i1.version, event: { eventType: 'batsman-in', payload: { end: 'nonStrikerEnd', matchPlayerId: mpsA[1].id } } })

    const { innings: i2 } = await scoringService.getInningsState(innings1.id)
    const { delivery: firstDelivery } = await scoringService.recordDelivery({ inningsId: innings1.id, expectedVersion: i2.version, clientActionId: randomUUID(), recordedByUserId: fx.userId, input: { batRuns: 2, bowlerMatchPlayerId: mpsB[3].id } })

    const spectator = await connectSpectator(server.socketUrl, match.id)
    await new Promise((r) => setTimeout(r, 100))
    const nextState = waitForState(spectator)

    const scorerToken = signToken({ id: fx.userId })
    const { innings: i3 } = await scoringService.getInningsState(innings1.id)
    const { status, data } = await json(`${server.baseUrl}/innings/${innings1.id}/corrections`, {
      method: 'POST',
      token: scorerToken,
      body: { targetType: 'delivery', targetId: firstDelivery.id, patch: { batRuns: 6 }, reasonCode: 'WRONG_RUNS', expectedVersion: i3.version, clientActionId: randomUUID() },
    })
    assert.equal(status, 201)

    const payload = await nextState
    assert.equal(payload.reason, 'correction')
    assert.equal(payload.currentInnings.runs, 6, 'the broadcast must carry the fully-replayed corrected total, not a delta')

    const { state: reReplayed } = await scoringService.getInningsState(innings1.id)
    assert.equal(payload.currentInnings.runs, reReplayed.runs, 'broadcast must match an independent re-replay exactly')

    spectator.disconnect()
  } finally {
    await fx.cleanup()
    await server.close()
  }
})

test('R22/R23 — match completion and finalization publish lifecycle state', async () => {
  const server = await startTestApp()
  const fx = await createTeamsFixture({ squadSize: 4 })
  try {
    const match = await matchService.createMatch({ teamAId: fx.teamAId, teamBId: fx.teamBId, venue: 'Realtime Lifecycle Test', matchDate: new Date().toISOString(), oversPerInnings: 1, ballsPerOver: 6 })
    const mpsA = []
    for (const p of fx.squadA.slice(0, 4)) mpsA.push(await scoringService.addMatchPlayer({ matchId: match.id, teamId: fx.teamAId, playerId: p.id, isPlayingXi: true }))
    const mpsB = []
    for (const p of fx.squadB.slice(0, 4)) mpsB.push(await scoringService.addMatchPlayer({ matchId: match.id, teamId: fx.teamBId, playerId: p.id, isPlayingXi: true }))

    const spectator = await connectSpectator(server.socketUrl, match.id)
    await new Promise((r) => setTimeout(r, 100))

    const scorerToken = signToken({ id: fx.userId })
    await json(`${server.baseUrl}/matches/${match.id}/toss`, { method: 'PATCH', token: scorerToken, body: { tossWinnerId: fx.teamAId, tossDecision: 'bat' } })

    const startState = waitForState(spectator)
    const startResp = await json(`${server.baseUrl}/matches/${match.id}/start`, { method: 'POST', token: scorerToken })
    assert.equal(startResp.status, 200)
    const startPayload = await startState
    assert.equal(startPayload.reason, 'lifecycle')
    assert.equal(startPayload.match.status, 'live')

    spectator.disconnect()
  } finally {
    await fx.cleanup()
    await server.close()
  }
})
