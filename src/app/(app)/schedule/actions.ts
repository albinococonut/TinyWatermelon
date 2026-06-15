"use server";

import {
  cancelAppointment as _cancel,
  completeAppointment as _complete,
  uncompleteAppointment as _uncomplete,
  uncancelAppointment as _uncancel,
} from "../me/actions";

export async function cancelAppointment(id: string, reason: string) {
  return _cancel(id, reason);
}

export async function completeAppointment(id: string) {
  return _complete(id);
}

export async function uncompleteAppointment(id: string) {
  return _uncomplete(id);
}

export async function uncancelAppointment(id: string) {
  return _uncancel(id);
}
