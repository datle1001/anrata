import unittest
from prepare_geographic_points import boundary_points, distance_km, extract, grid_points, review_status


class GeographicPreparationTests(unittest.TestCase):
    def test_grid_preserves_holes(self):
        polygon = [[[20,60],[21,60],[21,61],[20,61],[20,60]],
                   [[20.4,60.4],[20.6,60.4],[20.6,60.6],[20.4,60.6],[20.4,60.4]]]
        points = grid_points([polygon], 0.1)
        self.assertIn([20.2,60.2],points)
        self.assertNotIn([20.5,60.5],points)

    def test_boundary_preserves_vertices_and_spacing(self):
        points = boundary_points([[[20,60],[20,61]]],5)
        self.assertEqual(points[0],[20,60])
        self.assertEqual(points[-1],[20,61])
        self.assertTrue(all(distance_km(a,b) <= 5.001 for a,b in zip(points,points[1:])))

    def test_wrong_coordinate_system_rejected(self):
        with self.assertRaises(ValueError):
            extract({'type':'LineString','coordinates':[[400000,7000000],[400001,7000001]]})

    def test_official_crs84_urn_accepted(self):
        _, lines = extract({'type':'LineString','crs':{'type':'name','properties':{'name':'urn:ogc:def:crs:CRS::84'}},
                            'coordinates':[[20,60],[21,61]]})
        self.assertEqual(len(lines),1)

    def test_line_cannot_replace_national_polygon(self):
        with self.assertRaises(ValueError):
            extract({'type':'LineString','coordinates':[[20,60],[21,61]]},polygons_only=True)

    def test_margin_requires_applicable_comparison(self):
        self.assertEqual(review_status(-10,applicability_confirmed=False),'unresolved')

    def test_margin_is_modifiable_without_changing_limit(self):
        self.assertEqual(review_status(4,applicability_confirmed=True,near_limit_margin_db=3),
                         'below-threshold-at-evaluated-points')
        self.assertEqual(review_status(4,applicability_confirmed=True,near_limit_margin_db=5),'near-limit')

    def test_exceedance_and_exact_threshold(self):
        self.assertEqual(review_status(-0.1,applicability_confirmed=True),'exceeds-applicable-threshold')
        self.assertEqual(review_status(0,applicability_confirmed=True),'near-limit')


if __name__ == '__main__':
    unittest.main()