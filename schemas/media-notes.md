## Notes

- Media is identified by content only.
- The ID of a media item is its full content.
- The system should auto-deduplicate when new content is registered.
- For content lookups, content is labeled with its SHA256 hash.
	While security is not a relevant aspect here, the desire to address
	documents that explicitly showcase hash collisions in MD5, or SHA1, is taken
	into account.
	Future-proofing is not relevant, as content and process are evaluated at
	build-time in the present. ??
- Media has a timeline, which records events of that media item.
	For example: printed by, signed by, stamped by, ...
	Every item has at least 1 event, the date when it was registered into the
	data set.

## What is a media item?

- Media can be physical or digital
- A media item in the time machine is a YAML description of metadata.
- The metadata describes another item than itself.
	Maybe obvious, but digital media can be a file. If the metadata is recorded
	in a file, it could describe the file it is stored in. It's unclear wether
	there could be any use for that.

	The clear distinction is helpful to understand metadata as a pointer to an
	item.

	An item can be located anywhere, the metadata is definitely owned by you and
	stored on your device. You could maintain metadata for the Mona Lisa painting
	without owning the painting. You don't even have to know the real location of
	the Mona Lisa, if your metadata is generic enough that any copy of the image
	will satisfy the media item.
- Media items for physical media are usually metadata descriptions of a digital
	copy of the physical item. By nature, the original document can not be converted
	into digital space - it can only be replicated in digital space.

	Thus, for any physical media item we want to describe, we create a photo, video,
	audio recording, or any other digital substitute, and then register that into
	our time machine dataset.

	Redundant metadata descriptions of the same physical item are valid, but undesirable.
	Just like with identities, redundancy can help building data around unknowns.
	For example, you can describe a birth certificate of a person without having
	ever seen it. If identities can be duplicates, so can their unseen birth
	certificate media items.
- Media items that describe physical documents, seen or unseen, can not be hashed.
	We can hash a digital replica of the document, if we have it, but even then
	can we only deduplicate copies of the replica, not the document itself. If we
	create a new photo of the same document, the hash of that photo is not going
	to match the hashes of any previous photo.
	For such items, the hashable content, that also represents the ID of the item,
	is the description of the item. As with any time machine data, IDs can always
	be entirely custom user-defined strings, as long as they are unique.
