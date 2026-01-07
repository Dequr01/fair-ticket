import { BigInt } from "@graphprotocol/graph-ts"
import {
  EventCreated,
  TicketMinted,
  TicketScanned,
  VerificationFailed
} from "../generated/FairTicket/FairTicket"
import { Event, Ticket, VerificationLog } from "../generated/schema"

export function handleEventCreated(event: EventCreated): void {
  let entity = new Event(event.params.eventId.toString())
  entity.organizer = event.params.organizer
  entity.name = event.params.name
  entity.createdAt = event.block.timestamp
  entity.save()
}

export function handleTicketMinted(event: TicketMinted): void {
  let entity = new Ticket(event.params.tokenId.toString())
  entity.event = event.params.eventId.toString()
  entity.owner = event.params.owner
  entity.isScanned = false
  entity.save()
}

export function handleTicketScanned(event: TicketScanned): void {
  let ticket = Ticket.load(event.params.tokenId.toString())
  if (ticket) {
    ticket.isScanned = true
    ticket.scannedAt = event.block.timestamp
    ticket.scannedBy = event.params.scannedBy
    ticket.save()

    let log = new VerificationLog(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
    log.ticket = ticket.id
    log.timestamp = event.block.timestamp
    log.success = true
    log.save()
  }
}

export function handleVerificationFailed(event: VerificationFailed): void {
  let log = new VerificationLog(event.transaction.hash.toHex() + "-" + event.logIndex.toString())
  log.ticket = event.params.tokenId.toString()
  log.timestamp = event.block.timestamp
  log.success = false
  log.reason = event.params.reason
  log.save()
}
